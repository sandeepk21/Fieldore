import { useLoader } from '@/src/context/LoaderContext';
import { loginApi } from '@/src/services/authService';
import { saveAuthData } from '@/src/utils/storage';
import { router } from 'expo-router';
import {
  ArrowRight,
  Chrome,
  Eye,
  EyeOff,
  Lock,
  Mail,
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
const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showLoader, hideLoader } = useLoader();
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  const handleLogin = async () => {
    debugger;
    showLoader();
    // 🔹 Trim inputs
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // 🔹 Validation
    if (!trimmedEmail) {
      alert('Email is required');
      hideLoader();
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      alert('Please enter a valid email');
      hideLoader();
      return;
    }

    if (!trimmedPassword) {
      alert('Password is required');
      hideLoader();
      return;
    }

    if (trimmedPassword.length < 6) {
      alert('Password must be at least 6 characters');
      hideLoader();
      return;
    }

    try {
      setLoading(true);

      const result = await loginApi({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (!result) {
        throw new Error('Invalid server response');
      }
      hideLoader();
      // 🔹 Extract data safely
      const token = result?.token;
      const user = {
        userId: result?.userId,
        email: result?.email,
        firstName: result?.firstName,
        lastName: result?.lastName,
        displayName: result?.displayName,
        businessId: result?.businessId,
      };

      if (!token) {
        throw new Error('Authentication failed: No token received');
      }

      // ✅ Save to AsyncStorage
      await saveAuthData(token, user);
      console.log('✅ Login Success:', user);
      if (user.businessId != null && user.businessId != "") {
        router.replace("../(tabs)/Dashboard");
      }
      else {
        // 🔹 Navigate
        router.replace("../Screens/BusinessSetupScreen");
      }

    } catch (error: any) {
      console.log('❌ Login Error:', error);

      if (error.message.includes('Network')) {
        alert('Network error. Please check your connection.');
      } else {
        alert(error.message || 'Login failed');
      }
    } finally {
      hideLoader();
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
              translucent
              backgroundColor="transparent"
              barStyle="dark-content"
            />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Zap size={30} color="white" fill="white" />
            </View>
            <Text style={styles.title}>
              Welcome <Text style={{ color: '#2563eb' }}>Back.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Log in to manage your jobs and team.
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            {/* Email Input */}
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

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={() => router.push("./ForgotPasswordScreen")}>
                  <Text style={styles.forgotText}>Forgot?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#cbd5e1"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity style={styles.loginButton} activeOpacity={0.8} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>Log In</Text>
              <ArrowRight size={20} color="white" strokeWidth={3} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login */}
          <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
            <Chrome size={20} color="#0f172a" />
            <Text style={styles.socialButtonText}>Sign in with Google</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.signUpLink} onPress={() => router.push("./SignUpScreen")}>Create one</Text>
            </Text>
          </View>
        </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
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
    // Shadow for iOS
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    // Shadow for Android
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#0f172a',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 8,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 4,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 1,
  },
  socialButton: {
    flexDirection: 'row',
    height: 56,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  signUpLink: {
    color: '#2563eb',
    fontWeight: '700',
  },
});

export default LoginScreen;