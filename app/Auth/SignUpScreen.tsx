import { router } from 'expo-router';
import {
    ArrowRight,
    Briefcase,
    CheckCircle2,
    ChevronDown,
    Lock,
    Mail,
    Phone,
    Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
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

const { width } = Dimensions.get('window');

const SignUpScreen = () => {
  const [email, setEmail] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Scrollable Content */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.logoBox}>
                <Zap size={20} color="white" fill="white" />
              </View>
              <Text style={styles.stepTag}>STEP 1 OF 2</Text>
            </View>
            
            <Text style={styles.title}>
              Create your {'\n'}
              <Text style={styles.blueText}>Pro Account.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Join 10k+ service professionals today.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            
            {/* Name Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="John"
                  placeholderTextColor="#cbd5e1"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Doe"
                  placeholderTextColor="#cbd5e1"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Work Email</Text>
              <View style={styles.iconInputWrapper}>
                <Mail size={18} color="#cbd5e1" style={styles.leftIcon} />
                <TextInput 
                  style={styles.iconInput}
                  placeholder="john@company.com"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.iconInputWrapper}>
                <Phone size={18} color="#cbd5e1" style={styles.leftIcon} />
                <TextInput 
                  style={styles.iconInput}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Business Type (Mock Select) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Type</Text>
              <TouchableOpacity style={styles.iconInputWrapper} activeOpacity={0.7}>
                <Briefcase size={18} color="#cbd5e1" style={styles.leftIcon} />
                <Text style={styles.mockSelectText}>Select your trade</Text>
                <ChevronDown size={18} color="#94a3b8" style={styles.rightIcon} />
              </TouchableOpacity>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Create Password</Text>
              <View style={styles.iconInputWrapper}>
                <Lock size={18} color="#cbd5e1" style={styles.leftIcon} />
                <TextInput 
                  style={styles.iconInput}
                  placeholder="••••••••"
                  placeholderTextColor="#cbd5e1"
                  secureTextEntry
                />
              </View>
              <View style={styles.requirementRow}>
                <CheckCircle2 size={12} color="#10b981" />
                <Text style={styles.requirementText}>At least 8 characters</Text>
              </View>
            </View>

            {/* Login Link */}
            <TouchableOpacity style={styles.loginLinkWrapper} onPress={() => router.push("./LoginScreen")}>
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
            <Text style={styles.legalBold}>Terms of Service</Text> and{' '}
            <Text style={styles.legalBold}>Privacy Policy</Text>.
          </Text>
          <TouchableOpacity style={styles.submitButton} activeOpacity={0.9}>
            <Text style={styles.submitButtonText}>Create Account</Text>
            <ArrowRight size={20} color="white" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 150, // Space for sticky footer
  },
  header: {
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  logoBox: {
    width: 40,
    height: 40,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  stepTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
    lineHeight: 32,
  },
  blueText: {
    color: '#2563eb',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 4,
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 4,
  },
  input: {
    height: 48,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  iconInputWrapper: {
    height: 48,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 'auto',
  },
  iconInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  mockSelectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 4,
    marginTop: 2,
  },
  requirementText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  loginLinkWrapper: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerBaseText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  blueLinkText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legalText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 14,
    fontWeight: '500',
  },
  legalBold: {
    color: '#1e293b',
    fontWeight: '700',
  },
  submitButton: {
    height: 64,
    backgroundColor: '#2563eb',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
});

export default SignUpScreen;