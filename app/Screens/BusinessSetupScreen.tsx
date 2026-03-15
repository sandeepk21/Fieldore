import { router } from 'expo-router';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Camera,
  ChevronDown,
  Globe,
  LucideIcon,
  Mail,
  MapPin,
  Phone,
  UploadCloud,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Interfaces ---
interface InputFieldProps {
  label?: string;
  icon?: LucideIcon;
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
}


// --- Reusable Components ---

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  icon: Icon, 
  placeholder, 
  value, 
  onChangeText,
  keyboardType = 'default' 
}) => (
  <View style={styles.inputContainer}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <View style={styles.inputWrapper}>
      {Icon && <Icon size={18} color="#cbd5e1" style={styles.inputIcon} />}
      <TextInput
        style={[styles.textInput, !Icon && { paddingLeft: 16 }]}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

const BusinessSetupScreen: React.FC= () => {
  return (
    <SafeAreaView style={[styles.container]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
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

          {/* Logo Upload Card */}
          <TouchableOpacity style={styles.logoCard} activeOpacity={0.7}>
            <View style={styles.logoUploadBox}>
              <Camera size={24} color="#94a3b8" />
              <View style={styles.uploadBadge}>
                <UploadCloud size={12} color="white" />
              </View>
            </View>
            <View style={styles.logoTextContent}>
              <Text style={styles.logoTitle}>Company Logo</Text>
              <Text style={styles.logoSub}>
                PNG or JPG, max 5MB. This will appear on your invoices.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Section 1: General Info */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>General Information</Text>
            </View>

            <InputField 
              label="Business Name" 
              icon={Building2} 
              placeholder="e.g. Acme Plumbing Co." 
            />

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Business Type</Text>
              <TouchableOpacity style={styles.inputWrapper} activeOpacity={0.7}>
                <Briefcase size={18} color="#cbd5e1" style={styles.inputIcon} />
                <Text style={styles.mockSelectText}>Plumbing</Text>
                <ChevronDown size={18} color="#94a3b8" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>

            <InputField label="Phone Number" icon={Phone} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" />
            <InputField label="Email Address" icon={Mail} placeholder="contact@business.com" keyboardType="email-address" />
            <InputField label="Website" icon={Globe} placeholder="www.yourcompany.com" keyboardType="url" />
          </View>

          {/* Section 2: Location Details */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>Location Details</Text>
            </View>

            <InputField label="Street Address" icon={MapPin} placeholder="123 Main St" />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <InputField label="City" placeholder="City" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="State" placeholder="State/Prov" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <InputField label="Country" placeholder="Country" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="Postal Code" placeholder="Zip/Postal" />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Footer */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.submitButton} 
            activeOpacity={0.9}
            onPress={()=>{ router.replace("../(tabs)/Dashboard") }}
          >
            <Text style={styles.submitButtonText}>Save and Continue</Text>
            <ArrowRight size={20} color="white" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles ---
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
  logoCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 24,
    gap: 20,
  },
  logoUploadBox: {
    width: 80,
    height: 80,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#2563eb',
    padding: 6,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoTextContent: {
    flex: 1,
  },
  logoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  logoSub: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 20,
    gap: 16,
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
});

export default BusinessSetupScreen;