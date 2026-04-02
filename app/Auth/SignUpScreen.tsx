import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Internal API Imports (Adjust paths as needed)
import { getFieldoreAPI, SignupRequest } from '@/src/api/generated';
import { useLoader } from '@/src/context/LoaderContext';

const { width } = Dimensions.get('window');

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<Record<keyof FormData | 'server', string>>;

const nameRegex = /^[A-Za-z][A-Za-z\s.'-]*$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordRules = [
  { test: (value: string) => value.length >= 8, message: 'Minimum 8 characters required' },
  { test: (value: string) => /[A-Z]/.test(value), message: 'At least one uppercase letter required' },
  { test: (value: string) => /[a-z]/.test(value), message: 'At least one lowercase letter required' },
  { test: (value: string) => /\d/.test(value), message: 'At least one number required' },
  {
    test: (value: string) => /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\/`~;]/.test(value),
    message: 'At least one special character required'
  }
];

/**
 * Validate a single field only
 * This is used for keyup/change-time validation so only one error is shown at a time.
 */
export const validateField = (
  field: keyof FormData,
  value: string,
  data: FormData
): string => {
  const trimmed = value.trim();

  switch (field) {
    case 'firstName':
      if (!trimmed) return 'First name is required';
      if (!nameRegex.test(trimmed)) return 'First name can contain only letters';
      if (trimmed.length < 2) return 'First name must be at least 2 characters';
      return '';

    case 'lastName':
      if (!trimmed) return 'Last name is required';
      if (!nameRegex.test(trimmed)) return 'Last name can contain only letters';
      if (trimmed.length < 2) return 'Last name must be at least 2 characters';
      return '';

    case 'email':
      if (!trimmed) return 'Email is required';
      if (!emailRegex.test(trimmed)) return 'Invalid email format';
      return '';

    case 'password':
      if (!value) return 'Password is required';
      for (const rule of passwordRules) {
        if (!rule.test(value)) return rule.message;
      }
      return '';

    case 'confirmPassword':
      if (!value) return 'Confirm password is required';
      if (value !== data.password) return 'Passwords do not match';
      return '';

    default:
      return '';
  }
};

/**
 * Validate the whole form, but stop at the first invalid field.
 * This is what gives you "one validation at a time" on submit.
 */
export const validateSignup = (data: FormData): FormErrors => {
  const fieldOrder: (keyof FormData)[] = [
    'firstName',
    'lastName',
    'email',
    'password',
    'confirmPassword'
  ];

  for (const field of fieldOrder) {
    const error = validateField(field, data[field], data);
    if (error) {
      return { [field]: error };
    }
  }

  return {};
};

const SignUpScreen = () => {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
const { showLoader, hideLoader } = useLoader();
  // Real-time validation for only the changed field
  const handleInputChange = (name: keyof FormData, value: string) => {
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);

    const fieldError = validateField(name, value, updatedData);

    // Show only one validation at a time
    if (fieldError) {
      setErrors({ [name]: fieldError });
    } else {
      setErrors({});
    }
  };

  // API Submission
  const handleSubmit = async () => {

    const finalErrors = validateSignup(formData);
showLoader();
    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      hideLoader();
      return;
    }

    setIsSubmitting(true);
    try {
      const api = getFieldoreAPI();
      const { confirmPassword, ...payload } = formData;

      const res = await api.postApiAuthSignup(payload as SignupRequest);

      if (res.data.success) {
        alert('Signup successful! Please log in.');
        router.replace('./LoginScreen');
      } else {
        setErrors({ server: res.data.message || 'Signup failed. Please try again.' });
      }
    } catch (err: any) {
      setErrors({ server: err.message || 'Connection error. Check your network.' });
    } finally {
      hideLoader();
      setIsSubmitting(false);
    }
  };

  const isFormValid = Object.keys(validateSignup(formData)).length === 0;
  const passLengthMet = (formData.password?.length ?? 0) >= 8;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.logoBox}>
                <Zap size={20} color="white" fill="white" />
              </View>
              <Text style={styles.stepTag}>NEW ACCOUNT</Text>
            </View>

            <Text style={styles.title}>
              Get started with {'\n'}
              <Text style={styles.blueText}>ProSaaS.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Manage your field operations with ease.
            </Text>
          </View>

          {/* Server Error Alert */}
          {errors.server && (
            <View style={styles.serverErrorBox}>
              <AlertCircle size={16} color="#ef4444" />
              <Text style={styles.serverErrorText}>{errors.server}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder="John"
                  placeholderTextColor="#cbd5e1"
                  value={formData.firstName}
                  onChangeText={(val) => handleInputChange('firstName', val)}
                />
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder="Doe"
                  placeholderTextColor="#cbd5e1"
                  value={formData.lastName}
                  onChangeText={(val) => handleInputChange('lastName', val)}
                />
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Work Email</Text>
              <View style={[styles.iconInputWrapper, errors.email && styles.inputError]}>
                <Mail size={18} color="#cbd5e1" style={styles.leftIcon} />
                <TextInput
                  style={styles.iconInput}
                  placeholder="john@company.com"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(val) => handleInputChange('email', val)}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.iconInputWrapper, errors.password && styles.inputError]}>
                <Lock size={18} color="#cbd5e1" style={styles.leftIcon} />
                <TextInput
                  style={styles.iconInput}
                  placeholder="••••••••"
                  placeholderTextColor="#cbd5e1"
                  secureTextEntry
                  value={formData.password}
                  onChangeText={(val) => handleInputChange('password', val)}
                />
              </View>
              <View style={styles.requirementRow}>
                <CheckCircle2 size={12} color={passLengthMet ? "#10b981" : "#cbd5e1"} />
                <Text style={[styles.requirementText, passLengthMet && { color: '#10b981' }]}>
                  At least 8 characters
                </Text>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.iconInputWrapper, errors.confirmPassword && styles.inputError]}>
                <Lock size={18} color="#cbd5e1" style={styles.leftIcon} />
                <TextInput
                  style={styles.iconInput}
                  placeholder="••••••••"
                  placeholderTextColor="#cbd5e1"
                  secureTextEntry
                  value={formData.confirmPassword}
                  onChangeText={(val) => handleInputChange('confirmPassword', val)}
                />
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.loginLinkWrapper}
              onPress={() => router.push('./LoginScreen')}
            >
              <Text style={styles.footerBaseText}>
                Already using ProSaaS? <Text style={styles.blueLinkText}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Sticky Footer */}
        <View style={styles.stickyFooter}>
          <Text style={styles.legalText}>
            By tapping Create Account, you agree to our{' '}
            <Text style={styles.legalBold}>Terms</Text> and <Text style={styles.legalBold}>Privacy Policy</Text>.
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, (!isFormValid || isSubmitting) && styles.submitButtonDisabled]}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Create Account</Text>
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 160 },
  header: { marginBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  logoBox: {
    width: 40, height: 40, backgroundColor: '#2563eb', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  stepTag: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -1, lineHeight: 32 },
  blueText: { color: '#2563eb' },
  subtitle: { fontSize: 14, color: '#94a3b8', fontWeight: '500', marginTop: 4 },
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', marginLeft: 4 },
  input: {
    height: 52, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9',
    borderRadius: 14, paddingHorizontal: 16, fontSize: 14, fontWeight: '700', color: '#0f172a'
  },
  inputError: { borderColor: '#fecaca', backgroundColor: '#fffafb' },
  iconInputWrapper: {
    height: 52, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9',
    borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16
  },
  leftIcon: { marginRight: 12 },
  iconInput: { flex: 1, height: '100%', fontSize: 14, fontWeight: '700', color: '#0f172a' },
  errorText: { fontSize: 10, color: '#ef4444', fontWeight: '700', marginLeft: 4 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4, marginTop: 2 },
  requirementText: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  serverErrorBox: {
    backgroundColor: '#fef2f2', padding: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20,
    borderWidth: 1, borderColor: '#fee2e2'
  },
  serverErrorText: { color: '#ef4444', fontSize: 12, fontWeight: '600', flex: 1 },
  loginLinkWrapper: { alignItems: 'center', marginTop: 12 },
  footerBaseText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  blueLinkText: { color: '#2563eb', fontWeight: '700' },
  stickyFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white',
    paddingHorizontal: 32, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9'
  },
  legalText: { fontSize: 10, color: '#94a3b8', textAlign: 'center', marginBottom: 20, lineHeight: 14 },
  legalBold: { color: '#1e293b', fontWeight: '700' },
  submitButton: {
    height: 64, backgroundColor: '#2563eb', borderRadius: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 8
  },
  submitButtonDisabled: { opacity: 0.5, backgroundColor: '#94a3b8' },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: '900' },
});

export default SignUpScreen;