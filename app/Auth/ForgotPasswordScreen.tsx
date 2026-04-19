import { router } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail
} from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
            <CheckCircle2 size={40} color="#10b981" />
          </View>
          <Text style={styles.titleTextCenter}>Check your email</Text>
          <Text style={styles.subtitleTextCenter}>
            We've sent a password reset link to {'\n'}
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>{email || 'your email'}</Text>
          </Text>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => setIsSubmitted(false)}
          >
            <Text style={styles.primaryButtonText}>Open Email App</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={()=>router.replace("./LoginScreen")}
          >
            <Text style={styles.secondaryButtonText}>Back to Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Top Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={()=>router.replace("./LoginScreen")} style={styles.backButton}>
          <ArrowLeft size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <KeyRound size={28} color="white" />
            </View>
            <Text style={styles.title}>Forgot {'\n'}password?</Text>
            <Text style={styles.subtitle}>
              No worries, we'll send you reset instructions.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@company.com"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setIsSubmitted(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Reset Password</Text>
              <ArrowRight size={20} color="white" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={()=>router.replace("./LoginScreen")}>
              <Text style={styles.footerText}>
                Remember password? <Text style={styles.blueLink}>Log In</Text>
              </Text>
            </TouchableOpacity>
          </View>
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
  navBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  header: {
    marginBottom: 40,
  },
  logoBox: {
    width: 56,
    height: 56,
    backgroundColor: '#2563eb',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 10,
    lineHeight: 22,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
    marginTop: 8,
    paddingInline: 24,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  blueLink: {
    color: '#2563eb',
    fontWeight: '700',
  },
  // Success State Styles
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  titleTextCenter: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitleTextCenter: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  secondaryButton: {
    marginTop: 20,
    padding: 10,
  },
  secondaryButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  }
});

export default ForgotPasswordScreen;