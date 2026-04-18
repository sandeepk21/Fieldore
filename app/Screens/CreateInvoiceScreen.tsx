import {
  CountryLookupResponse,
  CustomerResponse,
  JobResponse,
  StateProvinceLookupResponse,
  getFieldoreAPI,
} from '@/src/api/generated';
import {
  formatCustomerAddress,
  getCustomerDisplayName,
  getCustomersApi,
  getPrimaryCustomerAddress,
} from '@/src/services/customerService';
import {
  createInvoiceApi,
  formatInvoiceCurrency,
  getInvoiceByIdApi,
  updateInvoiceApi,
} from '@/src/services/invoiceService';
import { getJobsApi } from '@/src/services/jobService';
import {
  INVOICE_STATUS_OPTIONS,
  InvoiceFormData,
  InvoiceFormErrors,
  NET_TERMS_OPTIONS,
  buildCreateInvoicePayload,
  buildUpdateInvoicePayload,
  createEmptyInvoiceLineItem,
  createInitialInvoiceFormData,
  getInvoiceGrandTotal,
  getInvoiceSubtotal,
  getInvoiceTaxAmount,
  mapInvoiceResponseToFormData,
  validateInvoiceField,
  validateInvoiceForm,
  validateInvoiceLineItemField,
} from '@/src/utils/invoiceValidation';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Banknote,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ActiveModal =
  | 'customer'
  | 'job'
  | 'status'
  | 'terms'
  | 'billingCountry'
  | 'billingState'
  | 'preview'
  | null;

type PaymentMethod = 'Online Pay' | 'Cash';

const api = getFieldoreAPI();

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType = 'default',
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
  maxLength?: number;
}) => (
  <View style={styles.formField}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={[styles.formInput, multiline && styles.formInputMultiline, error && styles.formInputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#cbd5e1"
      keyboardType={keyboardType}
      multiline={multiline}
      maxLength={maxLength}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const TriggerField = ({
  label,
  value,
  placeholder,
  onPress,
  error,
  disabled,
  loading,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <View style={styles.formField}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TouchableOpacity
      style={[styles.triggerInput, error && styles.formInputError, disabled && styles.triggerInputDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.triggerInputText, !value && styles.triggerPlaceholder]}>
        {loading ? 'Loading...' : value || placeholder}
      </Text>
      <ChevronDown size={16} color="#94a3b8" />
    </TouchableOpacity>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const formatDisplayDate = (value: string) => value || new Date().toLocaleDateString('en-US');

const findCountryMatch = (countries: CountryLookupResponse[], rawValue: string) => {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) return null;
  return (
    countries.find(country => (country.code || '').trim().toLowerCase() === normalized) ||
    countries.find(country => (country.name || '').trim().toLowerCase() === normalized) ||
    null
  );
};

const findStateMatch = (states: StateProvinceLookupResponse[], rawValue: string) => {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) return null;
  return (
    states.find(state => (state.code || '').trim().toLowerCase() === normalized) ||
    states.find(state => (state.name || '').trim().toLowerCase() === normalized) ||
    null
  );
};

const CreateInvoiceScreen: React.FC = () => {
  const params = useLocalSearchParams<{ invoiceId?: string }>();
  const invoiceId = typeof params.invoiceId === 'string' ? params.invoiceId : '';
  const isEditMode = Boolean(invoiceId);

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<InvoiceFormData>(createInitialInvoiceFormData());
  const [errors, setErrors] = useState<InvoiceFormErrors>({});
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [countries, setCountries] = useState<CountryLookupResponse[]>([]);
  const [states, setStates] = useState<StateProvinceLookupResponse[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Online Pay');
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [screenError, setScreenError] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find(customer => customer.id === formData.customerId) || null,
    [customers, formData.customerId]
  );

  const selectedJob = useMemo(
    () => jobs.find(job => job.id === formData.jobId) || null,
    [jobs, formData.jobId]
  );

  const selectedCountry = useMemo(
    () => findCountryMatch(countries, formData.billingCountry),
    [countries, formData.billingCountry]
  );

  const selectedState = useMemo(
    () => findStateMatch(states, formData.billingStateOrProvince),
    [formData.billingStateOrProvince, states]
  );

  const customerJobs = useMemo(() => {
    if (!formData.customerId) return jobs;
    return jobs.filter(job => job.customerId === formData.customerId);
  }, [formData.customerId, jobs]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredCustomers = useMemo(() => {
    if (!normalizedSearch) return customers;
    return customers.filter(customer => {
      const name = getCustomerDisplayName(customer).toLowerCase();
      const email = customer.email?.toLowerCase() || '';
      return name.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
  }, [customers, normalizedSearch]);

  const filteredJobs = useMemo(() => {
    const source = customerJobs;
    if (!normalizedSearch) return source;
    return source.filter(job => {
      const title = job.title?.toLowerCase() || '';
      const number = job.jobNumber?.toLowerCase() || '';
      const id = job.id?.toLowerCase() || '';
      return title.includes(normalizedSearch) || number.includes(normalizedSearch) || id.includes(normalizedSearch);
    });
  }, [customerJobs, normalizedSearch]);

  const filteredCountries = useMemo(() => {
    if (!normalizedSearch) return countries;
    return countries.filter(country => {
      const code = country.code?.toLowerCase() || '';
      const name = country.name?.toLowerCase() || '';
      return name.includes(normalizedSearch) || code.includes(normalizedSearch);
    });
  }, [countries, normalizedSearch]);

  const filteredStates = useMemo(() => {
    if (!normalizedSearch) return states;
    return states.filter(state => {
      const code = state.code?.toLowerCase() || '';
      const name = state.name?.toLowerCase() || '';
      return name.includes(normalizedSearch) || code.includes(normalizedSearch);
    });
  }, [normalizedSearch, states]);

  const subtotal = useMemo(() => getInvoiceSubtotal(formData.lineItems), [formData.lineItems]);
  const taxAmount = useMemo(
    () => getInvoiceTaxAmount(formData.lineItems, formData.taxRate),
    [formData.lineItems, formData.taxRate]
  );
  const grandTotal = useMemo(
    () => getInvoiceGrandTotal(formData.lineItems, formData.taxRate, formData.discountAmount),
    [formData.discountAmount, formData.lineItems, formData.taxRate]
  );

  const loadBootstrapData = useCallback(async () => {
    setIsBootLoading(true);
    setScreenError('');
    setIsLoadingCountries(true);

    try {
      const [customersResponse, jobsResponse, countriesResponse, invoiceResponse] = await Promise.all([
        getCustomersApi({ pageNumber: 1, pageSize: 100 }),
        getJobsApi({ PageNumber: 1, PageSize: 100 }),
        api.getApiLocationsCountries(),
        invoiceId ? getInvoiceByIdApi(invoiceId) : Promise.resolve(null),
      ]);

      const countriesResult = countriesResponse.data;
      if (!countriesResult.success) {
        throw new Error(countriesResult.message || 'Failed to load countries');
      }

      setCustomers(customersResponse.data);
      setJobs(jobsResponse.data);
      setCountries(countriesResult.data || []);

      if (invoiceResponse) {
        setFormData(mapInvoiceResponseToFormData(invoiceResponse));
      }
    } catch (loadError: any) {
      setScreenError(loadError?.message || 'Failed to load invoice form.');
    } finally {
      setIsLoadingCountries(false);
      setIsBootLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadBootstrapData();
  }, [loadBootstrapData]);

  useEffect(() => {
    const fetchStates = async () => {
      if (!formData.billingCountry.trim()) {
        setStates([]);
        return;
      }

      setIsLoadingStates(true);

      try {
        const response = await api.getApiLocationsStates({
          countryCode: selectedCountry?.code || formData.billingCountry.trim(),
        });
        const result = response.data;

        if (!result.success) {
          throw new Error(result.message || 'Failed to load states');
        }

        setStates(result.data || []);
      } catch (loadError: any) {
        setStates([]);
        setErrors(current => ({
          ...current,
          server: loadError?.message || 'Failed to load states.',
        }));
      } finally {
        setIsLoadingStates(false);
      }
    };

    fetchStates();
  }, [formData.billingCountry, selectedCountry?.code]);

  const updateField = useCallback(
    (field: keyof InvoiceFormData, value: string) => {
      const nextData = { ...formData, [field]: value } as InvoiceFormData;

      if (field === 'customerId' && formData.jobId) {
        const jobStillValid = jobs.some(job => job.id === formData.jobId && job.customerId === value);
        if (!jobStillValid) {
          nextData.jobId = '';
        }
      }

      if (field === 'billingCountry') {
        nextData.billingStateOrProvince = '';
      }

      setFormData(nextData);

      setErrors(current => ({
        ...current,
        [field]: validateInvoiceField(field, nextData[field], nextData) || undefined,
        server: undefined,
      }));
    },
    [formData, jobs]
  );

  const updateLineItem = (
    itemId: string,
    field: 'name' | 'description' | 'quantity' | 'unitRate',
    value: string
  ) => {
    const nextItems = formData.lineItems.map(item => (item.id === itemId ? { ...item, [field]: value } : item));
    const nextFormData = { ...formData, lineItems: nextItems };
    const nextItem = nextItems.find(item => item.id === itemId);

    setFormData(nextFormData);

    if (!nextItem) return;

    setErrors(current => ({
      ...current,
      [`lineItem.${itemId}.${field}`]: validateInvoiceLineItemField(nextItem, field) || undefined,
      lineItems: validateInvoiceField('lineItems', nextItems, nextFormData) || undefined,
      server: undefined,
    }));
  };

  const addLineItem = () => {
    setFormData(current => ({
      ...current,
      lineItems: [...current.lineItems, createEmptyInvoiceLineItem()],
    }));
  };

  const removeLineItem = (itemId: string) => {
    if (formData.lineItems.length === 1) return;

    const nextItems = formData.lineItems.filter(item => item.id !== itemId);
    setFormData(current => ({ ...current, lineItems: nextItems }));
  };

  const applyCustomerBillingAddress = useCallback(
    (customer?: CustomerResponse | null) => {
      const address = getPrimaryCustomerAddress(customer);
      const matchedCountry = address?.country ? findCountryMatch(countries, address.country) : null;

      setFormData(current => ({
        ...current,
        billingLine1: address?.line1?.trim() || '',
        billingLine2: address?.line2?.trim() || '',
        billingCity: address?.city?.trim() || '',
        billingStateOrProvince: address?.stateOrProvince?.trim() || '',
        billingPostalCode: address?.postalCode?.trim() || '',
        billingCountry: matchedCountry?.code || address?.country?.trim() || '',
      }));
    },
    [countries]
  );

  const openModal = (modal: ActiveModal) => {
    setSearchQuery('');
    setActiveModal(modal);
  };

  const closeModal = () => {
    setSearchQuery('');
    setActiveModal(null);
  };

  const submitInvoice = async () => {
    const validationErrors = validateInvoiceForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      Alert.alert('Validation error', Object.values(validationErrors)[0] || 'Please check the form and try again.');
      return;
    }

    setIsSaving(true);

    try {
      const response = isEditMode
        ? await updateInvoiceApi(invoiceId, buildUpdateInvoicePayload(formData))
        : await createInvoiceApi(buildCreateInvoicePayload(formData));

      Alert.alert('Success', isEditMode ? 'Invoice updated successfully.' : 'Invoice created successfully.', [
        {
          text: 'Open Invoice',
          onPress: () =>
            router.replace({
              pathname: '../Screens/InvoiceDetailScreen',
              params: { invoiceId: response.id || invoiceId },
            }),
        },
      ]);
    } catch (saveError: any) {
      setErrors(current => ({
        ...current,
        server: saveError?.message || 'Failed to save invoice.',
      }));
    } finally {
      setIsSaving(false);
    }
  };

  if (isBootLoading) {
    return (
      <SafeAreaView style={styles.loaderScreen}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loaderText}>Loading invoice form...</Text>
      </SafeAreaView>
    );
  }

  if (screenError) {
    return (
      <SafeAreaView style={styles.loaderScreen}>
        <Text style={styles.errorTitle}>Unable to load invoice form</Text>
        <Text style={styles.loaderText}>{screenError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBootstrapData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <ChevronLeft size={20} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{isEditMode ? 'Update Invoice' : 'Create Invoice'}</Text>
            <Text style={styles.headerSubtitle}>{formData.status.toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => openModal('preview')}>
            <MoreHorizontal size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTEXT</Text>

            <TouchableOpacity style={[styles.card, errors.customerId && styles.cardError]} onPress={() => openModal('customer')}>
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, selectedCustomer ? styles.iconBoxActiveBlue : styles.iconBoxInactive]}>
                  <User size={22} color={selectedCustomer ? '#2563eb' : '#cbd5e1'} />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {selectedCustomer ? getCustomerDisplayName(selectedCustomer) : 'Select Customer'}
                  </Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {selectedCustomer?.email?.trim() || 'Required info'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>
            {errors.customerId ? <Text style={styles.errorText}>{errors.customerId}</Text> : null}

            <TouchableOpacity style={styles.card} onPress={() => openModal('job')}>
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, selectedJob ? styles.iconBoxActiveAmber : styles.iconBoxInactive]}>
                  <Briefcase size={22} color={selectedJob ? '#d97706' : '#cbd5e1'} />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {selectedJob?.jobNumber?.trim() || selectedJob?.id || 'Link Reference'}
                  </Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {selectedJob?.title?.trim() || 'Optional link'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>SERVICES & ITEMS</Text>
              <TouchableOpacity onPress={addLineItem} style={styles.addItemBtn}>
                <Plus size={16} color="#2563eb" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {formData.lineItems.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                  <TextInput
                    style={[styles.itemNameInput, errors[`lineItem.${item.id}.name`] && styles.itemTextError]}
                    value={item.name}
                    onChangeText={value => updateLineItem(item.id, 'name', value)}
                    placeholder="Service Name..."
                    placeholderTextColor="#e2e8f0"
                  />
                  <TouchableOpacity onPress={() => removeLineItem(item.id)}>
                    <Trash2 size={18} color={formData.lineItems.length === 1 ? '#e2e8f0' : '#94a3b8'} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.itemDescriptionInput, errors[`lineItem.${item.id}.description`] && styles.itemTextError]}
                  value={item.description}
                  onChangeText={value => updateLineItem(item.id, 'description', value)}
                  placeholder="Description..."
                  placeholderTextColor="#cbd5e1"
                  multiline
                />

                <View style={styles.itemInputsRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>QUANTITY</Text>
                    <TextInput
                      style={[styles.numberInput, errors[`lineItem.${item.id}.quantity`] && styles.numberInputError]}
                      keyboardType="numeric"
                      value={item.quantity}
                      onChangeText={value => updateLineItem(item.id, 'quantity', value)}
                    />
                  </View>
                  <View style={styles.inputGroupLast}>
                    <Text style={styles.inputLabel}>RATE ($)</Text>
                    <TextInput
                      style={[styles.numberInput, errors[`lineItem.${item.id}.unitRate`] && styles.numberInputError]}
                      keyboardType="numeric"
                      value={item.unitRate}
                      onChangeText={value => updateLineItem(item.id, 'unitRate', value)}
                    />
                  </View>
                </View>
              </View>
            ))}
            {errors.lineItems ? <Text style={styles.errorText}>{errors.lineItems}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INVOICE DETAILS</Text>
            <View style={styles.formCard}>
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <InputField
                    label="Issued On"
                    value={formData.issuedOn}
                    onChangeText={value => updateField('issuedOn', value)}
                    placeholder="YYYY-MM-DD"
                    error={errors.issuedOn}
                  />
                </View>
                <View style={styles.formHalf}>
                  <InputField
                    label="Due On"
                    value={formData.dueOn}
                    onChangeText={value => updateField('dueOn', value)}
                    placeholder="YYYY-MM-DD"
                    error={errors.dueOn}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.inlineSelectCard} onPress={() => openModal('terms')}>
                <Text style={styles.inlineSelectLabel}>NET TERMS</Text>
                <View style={styles.inlineSelectValueRow}>
                  <Text style={styles.inlineSelectValue}>{formData.netTerms}</Text>
                  <ChevronRight size={16} color="#cbd5e1" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.inlineSelectCard} onPress={() => openModal('status')}>
                <Text style={styles.inlineSelectLabel}>STATUS</Text>
                <View style={styles.inlineSelectValueRow}>
                  <Text style={styles.inlineSelectValue}>{formData.status}</Text>
                  <ChevronRight size={16} color="#cbd5e1" />
                </View>
              </TouchableOpacity>

              <InputField
                label="Purchase Order Number"
                value={formData.purchaseOrderNumber}
                onChangeText={value => updateField('purchaseOrderNumber', value)}
                placeholder="Optional PO number"
                error={errors.purchaseOrderNumber}
                maxLength={80}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CALCULATION</Text>
            <View style={styles.calcCard}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Subtotal</Text>
                <Text style={styles.calcValue}>{formatInvoiceCurrency(subtotal)}</Text>
              </View>
              <View style={styles.calcRow}>
                <View style={styles.taxRowLeft}>
                  <Text style={styles.calcLabel}>Sales Tax</Text>
                  <View style={styles.taxInputContainer}>
                    <TextInput
                      style={styles.taxInput}
                      keyboardType="numeric"
                      value={formData.taxRate}
                      onChangeText={value => updateField('taxRate', value)}
                    />
                    <Text style={styles.taxPercentSymbol}>%</Text>
                  </View>
                </View>
                <Text style={styles.calcValueBold}>{formatInvoiceCurrency(taxAmount)}</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Discount</Text>
                <TextInput
                  style={[styles.discountInput, errors.discountAmount && styles.discountInputError]}
                  keyboardType="numeric"
                  value={formData.discountAmount}
                  onChangeText={value => updateField('discountAmount', value)}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.calcGrandRow}>
                <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
                <Text style={styles.grandTotalValue}>{formatInvoiceCurrency(grandTotal)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BILLING ADDRESS</Text>
            <View style={styles.formCard}>
              <TouchableOpacity
                style={styles.addressHelperPill}
                onPress={() => applyCustomerBillingAddress(selectedCustomer)}
                disabled={!selectedCustomer}
              >
                <MapPin size={16} color={selectedCustomer ? '#2563eb' : '#94a3b8'} />
                <Text style={[styles.addressHelperPillText, !selectedCustomer && styles.addressHelperPillTextDisabled]}>
                  Use customer primary address
                </Text>
              </TouchableOpacity>

              <InputField
                label="Address Line 1"
                value={formData.billingLine1}
                onChangeText={value => updateField('billingLine1', value)}
                placeholder="Street address"
                error={errors.billingLine1}
              />
              <InputField
                label="Address Line 2"
                value={formData.billingLine2}
                onChangeText={value => updateField('billingLine2', value)}
                placeholder="Apartment, suite, etc."
              />
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <InputField
                    label="City"
                    value={formData.billingCity}
                    onChangeText={value => updateField('billingCity', value)}
                    placeholder="City"
                    error={errors.billingCity}
                  />
                </View>
                <View style={styles.formHalf}>
                  <InputField
                    label="Postal Code"
                    value={formData.billingPostalCode}
                    onChangeText={value => updateField('billingPostalCode', value)}
                    placeholder="Postal code"
                    error={errors.billingPostalCode}
                  />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formHalf}>
                  <TriggerField
                    label="Country"
                    value={selectedCountry?.name || formData.billingCountry}
                    placeholder="Select country"
                    onPress={() => openModal('billingCountry')}
                    error={errors.billingCountry}
                    loading={isLoadingCountries}
                  />
                </View>
                <View style={styles.formHalf}>
                  <TriggerField
                    label="State / Province"
                    value={selectedState?.name || formData.billingStateOrProvince}
                    placeholder="Select state"
                    onPress={() => openModal('billingState')}
                    error={errors.billingStateOrProvince}
                    disabled={!formData.billingCountry}
                    loading={isLoadingStates}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
            <View style={styles.paymentRow}>
              {(['Online Pay', 'Cash'] as PaymentMethod[]).map(method => {
                const isSelected = paymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setPaymentMethod(method)}
                    style={[styles.paymentBtn, isSelected ? styles.paymentBtnActive : styles.paymentBtnInactive]}
                  >
                    {method === 'Online Pay' ? (
                      <CreditCard size={18} color={isSelected ? '#FFF' : '#64748b'} />
                    ) : (
                      <Banknote size={18} color={isSelected ? '#FFF' : '#64748b'} />
                    )}
                    <Text style={isSelected ? styles.paymentTextActive : styles.paymentTextInactive}>{method}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTES</Text>
            <View style={styles.formCard}>
              <InputField
                label="Invoice Notes"
                value={formData.notes}
                onChangeText={value => updateField('notes', value)}
                placeholder="Optional internal or customer-facing notes"
                error={errors.notes}
                multiline
                maxLength={1000}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.previewBtn} onPress={() => openModal('preview')}>
            <Eye size={18} color="#FFF" />
            <Text style={styles.previewBtnText}>Preview PDF Document</Text>
          </TouchableOpacity>

          {errors.server ? <Text style={styles.errorText}>{errors.server}</Text> : null}
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.bottomBarTextContainer}>
            <Text style={styles.bottomBarLabel}>AMOUNT DUE</Text>
            <Text style={styles.bottomBarValue}>{formatInvoiceCurrency(grandTotal)}</Text>
          </View>
          <TouchableOpacity style={[styles.sendBtn, isSaving && styles.buttonDisabled]} onPress={submitInvoice} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <CheckCircle2 size={20} color="#FFF" strokeWidth={3} />}
            <Text style={styles.sendBtnText}>{isEditMode ? 'Update Invoice' : 'Send Invoice'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {activeModal === 'customer' && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color="#cbd5e1" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search database..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <ScrollView style={styles.modalScroll}>
              {filteredCustomers.map(customer => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.modalListItem}
                  onPress={() => {
                    updateField('customerId', customer.id || '');
                    applyCustomerBillingAddress(customer);
                    closeModal();
                  }}
                >
                  <View style={styles.modalListItemLeft}>
                    <View style={styles.avatarLetter}>
                      <Text style={styles.avatarLetterText}>{getCustomerDisplayName(customer).charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.modalListTitle}>{getCustomerDisplayName(customer)}</Text>
                      <Text style={styles.modalListSubtitle}>
                        {customer.email?.trim() || formatCustomerAddress(getPrimaryCustomerAddress(customer))}
                      </Text>
                    </View>
                  </View>
                  {selectedCustomer?.id === customer.id && (
                    <View style={styles.checkCircle}>
                      <Check size={14} color="white" strokeWidth={4} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      )}

      {activeModal === 'job' && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Job</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color="#cbd5e1" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search jobs..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={styles.modalListItem}
                onPress={() => {
                  updateField('jobId', '');
                  closeModal();
                }}
              >
                <View style={styles.modalListItemLeft}>
                  <View style={styles.avatarLetter}>
                    <Text style={styles.avatarLetterText}>-</Text>
                  </View>
                  <View>
                    <Text style={styles.modalListTitle}>No linked job</Text>
                    <Text style={styles.modalListSubtitle}>Leave this invoice independent from a job</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {filteredJobs.map(job => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.modalListItem}
                  onPress={() => {
                    updateField('jobId', job.id || '');
                    closeModal();
                  }}
                >
                  <View style={styles.modalJobContent}>
                    <Text style={styles.jobRefId}>{job.jobNumber?.trim() || job.id}</Text>
                    <Text style={styles.modalListTitle}>{job.title?.trim() || 'Untitled job'}</Text>
                    <View style={styles.jobStatusRow}>
                      <View style={styles.statusDot} />
                      <Text style={styles.jobStatusText}>{job.status || 'Scheduled'}</Text>
                    </View>
                  </View>
                  {selectedJob?.id === job.id && (
                    <View style={styles.checkCircle}>
                      <Check size={14} color="white" strokeWidth={4} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      )}

      {(activeModal === 'status' || activeModal === 'terms' || activeModal === 'billingCountry' || activeModal === 'billingState') && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'status'
                  ? 'Select Status'
                  : activeModal === 'terms'
                    ? 'Select Net Terms'
                    : activeModal === 'billingCountry'
                      ? 'Select Country'
                      : 'Select State'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {(activeModal === 'billingCountry' || activeModal === 'billingState') && (
              <View style={styles.searchContainer}>
                <Search size={18} color="#cbd5e1" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={activeModal === 'billingCountry' ? 'Search country...' : 'Search state...'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            )}

            <ScrollView style={styles.modalScroll}>
              {activeModal === 'status' &&
                INVOICE_STATUS_OPTIONS.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={styles.modalListItem}
                    onPress={() => {
                      updateField('status', status);
                      closeModal();
                    }}
                  >
                    <Text style={styles.modalListTitle}>{status}</Text>
                    {formData.status === status && (
                      <View style={styles.checkCircle}>
                        <Check size={14} color="white" strokeWidth={4} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

              {activeModal === 'terms' &&
                NET_TERMS_OPTIONS.map(term => (
                  <TouchableOpacity
                    key={term}
                    style={styles.modalListItem}
                    onPress={() => {
                      updateField('netTerms', term);
                      closeModal();
                    }}
                  >
                    <Text style={styles.modalListTitle}>{term}</Text>
                    {formData.netTerms === term && (
                      <View style={styles.checkCircle}>
                        <Check size={14} color="white" strokeWidth={4} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

              {activeModal === 'billingCountry' &&
                filteredCountries.map(country => (
                  <TouchableOpacity
                    key={country.code}
                    style={styles.modalListItem}
                    onPress={() => {
                      updateField('billingCountry', country.code || '');
                      closeModal();
                    }}
                  >
                    <View>
                      <Text style={styles.modalListTitle}>{country.name || country.code || 'Country'}</Text>
                      <Text style={styles.modalListSubtitle}>{country.code || ''}</Text>
                    </View>
                    {selectedCountry?.code === country.code && (
                      <View style={styles.checkCircle}>
                        <Check size={14} color="white" strokeWidth={4} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

              {activeModal === 'billingState' &&
                filteredStates.map(state => (
                  <TouchableOpacity
                    key={state.code || state.name}
                    style={styles.modalListItem}
                    onPress={() => {
                      updateField('billingStateOrProvince', state.code || state.name || '');
                      closeModal();
                    }}
                  >
                    <View>
                      <Text style={styles.modalListTitle}>{state.name || state.code || 'State'}</Text>
                      <Text style={styles.modalListSubtitle}>{state.code || ''}</Text>
                    </View>
                    {(selectedState?.code || selectedState?.name) === (state.code || state.name) && (
                      <View style={styles.checkCircle}>
                        <Check size={14} color="white" strokeWidth={4} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      )}

      {activeModal === 'preview' && (
        <View style={styles.previewBackdrop}>
          <View style={styles.previewSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice Preview</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewPaperContainer}>
              <ScrollView style={styles.previewPaper} showsVerticalScrollIndicator={false}>
                <View style={styles.previewHeaderRow}>
                  <Text style={styles.previewLogo}>FIELDORE.</Text>
                  <View style={styles.previewHeaderMeta}>
                    <Text style={styles.previewSmallLabel}>INV STATUS</Text>
                    <Text style={styles.previewInvNumber}>{formData.status}</Text>
                  </View>
                </View>

                <View style={styles.previewMetaRow}>
                  <View>
                    <Text style={styles.previewSmallLabel}>BILL TO</Text>
                    <Text style={styles.previewClientName}>
                      {selectedCustomer ? getCustomerDisplayName(selectedCustomer) : 'Client Name'}
                    </Text>
                    <Text style={styles.previewClientEmail}>{selectedCustomer?.email?.trim() || 'Email'}</Text>
                  </View>
                  <View style={styles.previewMetaRight}>
                    <Text style={styles.previewSmallLabel}>DATE</Text>
                    <Text style={styles.previewDate}>{formatDisplayDate(formData.issuedOn)}</Text>
                    <Text style={[styles.previewSmallLabel, styles.previewDueLabel]}>DUE</Text>
                    <Text style={styles.previewDate}>{formatDisplayDate(formData.dueOn)}</Text>
                  </View>
                </View>

                <View style={styles.previewAddressBlock}>
                  <Text style={styles.previewSmallLabel}>ADDRESS</Text>
                  <Text style={styles.previewClientEmail}>{formData.billingLine1 || 'No address selected'}</Text>
                  {!!formData.billingLine2 && <Text style={styles.previewClientEmail}>{formData.billingLine2}</Text>}
                  <Text style={styles.previewClientEmail}>
                    {[formData.billingCity, selectedState?.name || formData.billingStateOrProvince, formData.billingPostalCode].filter(Boolean).join(', ')}
                  </Text>
                  <Text style={styles.previewClientEmail}>{selectedCountry?.name || formData.billingCountry || ''}</Text>
                </View>

                <View style={styles.tableHeader}>
                  <Text style={styles.thLeft}>DESCRIPTION</Text>
                  <Text style={styles.thRight}>TOTAL</Text>
                </View>

                <View style={styles.tableBody}>
                  {formData.lineItems.map(item => (
                    <View key={item.id} style={styles.tableRow}>
                      <View style={styles.previewItemContent}>
                        <Text style={styles.tdTitle}>{item.name || 'Unnamed Service'}</Text>
                        <Text style={styles.tdSub}>
                          {(Number(item.quantity) || 0).toString()} units @ {formatInvoiceCurrency(Number(item.unitRate) || 0)}
                        </Text>
                        {!!item.description && <Text style={styles.previewLineDescription}>{item.description}</Text>}
                      </View>
                      <Text style={styles.tdTotal}>
                        {formatInvoiceCurrency((Number(item.quantity) || 0) * (Number(item.unitRate) || 0))}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.previewTotals}>
                  <View style={styles.previewTotalRow}>
                    <Text style={styles.previewTotalLabel}>SUBTOTAL</Text>
                    <Text style={styles.previewTotalValue}>{formatInvoiceCurrency(subtotal)}</Text>
                  </View>
                  <View style={styles.previewTotalRow}>
                    <Text style={styles.previewTotalLabel}>TAX ({formData.taxRate || '0'}%)</Text>
                    <Text style={styles.previewTotalValue}>{formatInvoiceCurrency(taxAmount)}</Text>
                  </View>
                  <View style={styles.previewTotalRow}>
                    <Text style={styles.previewTotalLabel}>DISCOUNT</Text>
                    <Text style={styles.previewTotalValue}>-{formatInvoiceCurrency(Number(formData.discountAmount) || 0)}</Text>
                  </View>
                  <View style={[styles.previewTotalRow, styles.previewGrandRow]}>
                    <Text style={styles.previewGrandLabel}>BALANCE DUE</Text>
                    <Text style={styles.previewGrandValue}>{formatInvoiceCurrency(grandTotal)}</Text>
                  </View>
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={closeModal}>
              <Text style={styles.shareBtnText}>CLOSE PREVIEW</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loaderScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 32,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '800',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    zIndex: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#FFFFFF',
  },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 160,
  },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginLeft: 4,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addItemText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardError: { borderColor: '#fca5a5' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconBoxActiveBlue: { backgroundColor: '#eff6ff' },
  iconBoxActiveAmber: { backgroundColor: '#fffbeb' },
  iconBoxInactive: { backgroundColor: '#f8fafc' },
  cardTextContainer: { flex: 1 },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 28,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemNameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginRight: 16,
    padding: 0,
  },
  itemDescriptionInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    padding: 0,
    marginBottom: 16,
    minHeight: 38,
    textAlignVertical: 'top',
  },
  itemTextError: {
    color: '#dc2626',
  },
  itemInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    flex: 1,
    marginRight: 16,
  },
  inputGroupLast: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginLeft: 4,
    marginBottom: 4,
  },
  numberInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  numberInputError: {
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formHalf: {
    flex: 1,
  },
  formField: {
    marginBottom: 16,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  formInputMultiline: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  formInputError: {
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  triggerInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerInputDisabled: { opacity: 0.55 },
  triggerInputText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  triggerPlaceholder: { color: '#94a3b8' },
  inlineSelectCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  inlineSelectLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  inlineSelectValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inlineSelectValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  calcCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calcLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  calcValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  calcValueBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  taxRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taxInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginLeft: 8,
  },
  taxInput: {
    width: 44,
    fontSize: 12,
    fontWeight: '900',
    color: '#2563eb',
    textAlign: 'center',
    padding: 0,
  },
  taxPercentSymbol: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
  },
  discountInput: {
    minWidth: 96,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'right',
  },
  discountInputError: {
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  calcGrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    paddingBottom: 4,
  },
  grandTotalValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  addressHelperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 16,
  },
  addressHelperPillText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  addressHelperPillTextDisabled: {
    color: '#94a3b8',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  paymentBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#bfdbfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 4,
  },
  paymentBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#f1f5f9',
  },
  paymentTextActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  paymentTextInactive: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#0f172a',
    borderRadius: 22,
    shadowColor: '#e2e8f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 4,
  },
  previewBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 30,
  },
  bottomBarTextContainer: { flex: 1 },
  bottomBarLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
  },
  bottomBarValue: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  sendBtn: {
    flex: 1.5,
    backgroundColor: '#2563eb',
    height: 64,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 50,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 24,
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  searchInput: {
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
  modalScroll: { flex: 1 },
  modalListItem: {
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
  modalListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalJobContent: { flex: 1 },
  avatarLetter: {
    width: 48,
    height: 48,
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarLetterText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2563eb',
  },
  modalListTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalListSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobRefId: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  jobStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  jobStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  previewBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.4)',
    zIndex: 60,
    justifyContent: 'flex-end',
  },
  previewSheet: {
    height: '92%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    padding: 32,
    flexDirection: 'column',
  },
  previewPaperContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    minHeight: 500,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  previewHeaderMeta: { alignItems: 'flex-end' },
  previewLogo: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: -1,
  },
  previewSmallLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  previewInvNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  previewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  previewMetaRight: { alignItems: 'flex-end' },
  previewDueLabel: { marginTop: 12 },
  previewAddressBlock: { marginBottom: 28 },
  previewClientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  previewClientEmail: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 2,
  },
  previewDate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 8,
    marginBottom: 8,
  },
  thLeft: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0f172a',
  },
  thRight: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0f172a',
  },
  tableBody: { marginBottom: 40 },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  previewItemContent: {
    flex: 1,
    paddingRight: 16,
  },
  tdTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  tdSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  previewLineDescription: {
    marginTop: 6,
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  tdTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  previewTotals: {
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
  },
  previewTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTotalLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
  },
  previewTotalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  previewGrandRow: { marginTop: 8 },
  previewGrandLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1.5,
  },
  previewGrandValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  shareBtn: {
    marginTop: 32,
    backgroundColor: '#2563eb',
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#bfdbfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 4,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  errorText: {
    marginTop: 4,
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default CreateInvoiceScreen;
