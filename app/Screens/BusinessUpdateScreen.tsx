import { useLoader } from '@/src/context/LoaderContext';
import { getBusinessDetailsApi, RegisterBusinessApi } from '@/src/services/authService';
import type { AxiosError } from 'axios';
import { router } from 'expo-router';
import {
    ArrowRight,
    Briefcase,
    Building2,
    ChevronDown,
    LucideIcon,
    MapPin,
    Phone,
    Zap,
} from 'lucide-react-native';
import React from 'react';
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

// Update this import path to your generated Orval file

const businessTypes = ['Plumbing', 'Electrical', 'Cleaning', 'HVAC'];

interface InputFieldProps {
  label?: string;
  icon?: LucideIcon;
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
  error?: string;
}

type FormState = {
  businessName: string;
  tradeType: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
  timeZone: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const getSystemTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const initialForm: FormState = {
  businessName: '',
  tradeType: 'Plumbing',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateOrProvince: '',
  postalCode: '',
  country: '',
  timeZone: getSystemTimeZone(),
};

const InputField: React.FC<InputFieldProps> = ({
  label,
  icon: Icon,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  error,
}) => (
  <View style={styles.inputContainer}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
      {Icon && <Icon size={18} color="#cbd5e1" style={styles.inputIcon} />}
      <TextInput
        style={[styles.textInput, !Icon && { paddingLeft: 16 }]}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="words"
      />
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const BusinessUpdateScreen: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [loading, setLoading] = React.useState(false);

  const { showLoader, hideLoader } = useLoader();
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = (data: FormState): FormErrors => {
    const errors: FormErrors = {};

    const trim = (val?: string) => val?.trim() || '';

    const businessName = trim(data.businessName);
    const tradeType = trim(data.tradeType);
    const phone = trim(data.phone);
    const address1 = trim(data.addressLine1);
    const city = trim(data.city);
    const state = trim(data.stateOrProvince);
    const postal = trim(data.postalCode);
    const country = trim(data.country);
    const timeZone = trim(data.timeZone);

    // ✅ Business Name
    if (!businessName) {
      errors.businessName = 'Business name is required';
    } else if (businessName.length < 2) {
      errors.businessName = 'Must be at least 2 characters';
    } else if (businessName.length > 100) {
      errors.businessName = 'Too long (max 100 chars)';
    }

    // ✅ Trade Type
    if (!tradeType) {
      errors.tradeType = 'Business type is required';
    }

    // ✅ Phone (International support)
    const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;
    if (!phone) {
      errors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(phone)) {
      errors.phone = 'Invalid phone number format';
    }

    // ✅ Address Line 1
    if (!address1) {
      errors.addressLine1 = 'Address is required';
    } else if (address1.length < 5) {
      errors.addressLine1 = 'Enter a valid address';
    }

    // ✅ City
    if (!city) {
      errors.city = 'City is required';
    } else if (!/^[a-zA-Z\s.-]{2,50}$/.test(city)) {
      errors.city = 'Invalid city name';
    }

    // ✅ State
    if (!state) {
      errors.stateOrProvince = 'State is required';
    }

    // ✅ Postal Code (basic global support)
    const postalRegex = /^[A-Za-z0-9\s-]{3,10}$/;
    if (!postal) {
      errors.postalCode = 'Postal code is required';
    } else if (!postalRegex.test(postal)) {
      errors.postalCode = 'Invalid postal code';
    }

    // ✅ Country
    if (!country) {
      errors.country = 'Country is required';
    } else if (!/^[a-zA-Z\s]{2,50}$/.test(country)) {
      errors.country = 'Invalid country name';
    }

    // ✅ Timezone
    if (!timeZone) {
      errors.timeZone = 'Timezone not detected';
    }

    return errors;
  };

  const handleSubmit = async () => {
    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      Alert.alert('Validation Error', 'Please fix the highlighted fields.');
      return;
    }

    setLoading(true);

    try {

      const result = await RegisterBusinessApi({
        businessName: form.businessName.trim(),
        tradeType: form.tradeType.trim(),
        phone: form.phone.trim(),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || null,
        city: form.city.trim(),
        stateOrProvince: form.stateOrProvince.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
        timeZone: form.timeZone.trim(),
      });

      const message =
        result?.message ?? 'Business registered successfully.';

      if (result?.success) {
        const token = result?.data?.token;
        const user = {
          userId: result?.data?.userId,
          email: result?.data?.email,
          firstName: result?.data?.firstName,
          lastName: result?.data?.lastName,
          displayName: result?.data?.displayName,
          businessId: result?.data?.businessId,
        };
        Alert.alert('Success', message, [
          {
            text: 'OK',
            onPress: () => router.replace('../(tabs)/Settings'),
          },
        ]);
      } else {
        Alert.alert('Error', message);
      }
    } catch (error) {
      const err = error as AxiosError<{
        message?: string;
        detail?: string;
      }>;

      const message =
        err.response?.data?.message ??
        err.response?.data?.detail ??
        'Something went wrong. Please try again.';

      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };
const loadBusiness = async () => {
  try {
    showLoader();

    const data = await getBusinessDetailsApi();

    setForm({
      businessName: data.name || '',
      tradeType: data.tradeType || 'Plumbing',
      phone: data.phone || '',
      addressLine1: data.address?.line1 || '',
      addressLine2: data.address?.line2 || '',
      city: data.address?.city || '',
      stateOrProvince: data.address?.stateOrProvince || '',
      postalCode: data.address?.postalCode || '',
      country: data.address?.country || '',
      timeZone: data.timeZone || getSystemTimeZone(),
    });

  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to load business');
  } finally {
    hideLoader();
  }
};
React.useEffect(() => {
  loadBusiness();
}, []);
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View style={styles.onboardingBadge}>
              <View style={styles.logoMini}>
                <Zap size={14} color="white" fill="white" />
              </View>
              <Text style={styles.badgeText}>ONBOARDING</Text>
            </View>
            <Text style={styles.title}>
              Setup your {'\n'}
              <Text style={styles.blueText}>Business.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Tell us about your company to get started.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>General Information</Text>
            </View>

            <InputField
              label="Business Name"
              icon={Building2}
              placeholder="e.g. Acme Plumbing Co."
              value={form.businessName}
              onChangeText={text => setField('businessName', text)}
              error={errors.businessName}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Business Type</Text>

              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  errors.tradeType ? styles.inputWrapperError : null,
                ]}
                activeOpacity={0.7}
                onPress={() => setDropdownOpen(!dropdownOpen)}
              >
                <Briefcase size={18} color="#cbd5e1" style={styles.inputIcon} />
                <Text style={styles.mockSelectText}>{form.tradeType}</Text>
                <ChevronDown
                  size={18}
                  color="#94a3b8"
                  style={{ marginLeft: 'auto' }}
                />
              </TouchableOpacity>

              {errors.tradeType ? (
                <Text style={styles.errorText}>{errors.tradeType}</Text>
              ) : null}

              {dropdownOpen && (
                <View style={styles.dropdown}>
                  {businessTypes.map(item => (
                    <TouchableOpacity
                      key={item}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setField('tradeType', item);
                        setDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <InputField
              label="Phone Number"
              icon={Phone}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={text => setField('phone', text)}
              error={errors.phone}
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>Location Details</Text>
            </View>

            <InputField
              label="Address Line 1"
              icon={MapPin}
              placeholder="Street address, building, etc."
              value={form.addressLine1}
              onChangeText={text => setField('addressLine1', text)}
              error={errors.addressLine1}
            />

            <InputField
              label="Address Line 2 (Optional)"
              icon={MapPin}
              placeholder="Apartment, suite, unit, etc."
              value={form.addressLine2}
              onChangeText={text => setField('addressLine2', text)}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="City"
                  placeholder="City"
                  value={form.city}
                  onChangeText={text => setField('city', text)}
                  error={errors.city}
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="State"
                  placeholder="State/Prov"
                  value={form.stateOrProvince}
                  onChangeText={text => setField('stateOrProvince', text)}
                  error={errors.stateOrProvince}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Country"
                  placeholder="Country"
                  value={form.country}
                  onChangeText={text => setField('country', text)}
                  error={errors.country}
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Postal Code"
                  placeholder="Zip/Postal"
                  value={form.postalCode}
                  onChangeText={text => setField('postalCode', text)}
                  error={errors.postalCode}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && { opacity: 0.8 }]}
            activeOpacity={0.9}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Save and Continue</Text>
                <ArrowRight size={20} color="white" strokeWidth={3} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 140,
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  onboardingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  logoMini: {
    width: 32,
    height: 32,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
    lineHeight: 34,
  },
  blueText: {
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 6,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 20,
    gap: 16,
    overflow: 'visible',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionIndicator: {
    width: 6,
    height: 16,
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputContainer: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  inputWrapper: {
    height: 48,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  mockSelectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  submitButton: {
    height: 64,
    backgroundColor: '#2563eb',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
});

export default BusinessUpdateScreen;