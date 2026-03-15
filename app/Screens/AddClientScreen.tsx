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
    X
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Interfaces ---
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
}

interface SelectFieldProps {
  label: string;
  icon: LucideIcon;
  value: string;
}

// --- Sub-Components ---

const Section: React.FC<SectionProps> = ({ title, accent, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIndicator, { backgroundColor: accent }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const InputField: React.FC<InputFieldProps> = ({ label, placeholder, icon: Icon, required, multiline, keyboardType = 'default' }) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required && <View style={styles.requiredDot} />}
    </View>
    <View style={[styles.inputWrapper, multiline && styles.textAreaWrapper]}>
      {Icon && <Icon size={16} color="#cbd5e1" style={multiline ? styles.iconTop : styles.iconCenter} />}
      <TextInput
        style={[styles.textInput, multiline && styles.textArea, !Icon && { paddingLeft: 16 }]}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

const SelectField: React.FC<SelectFieldProps> = ({ label, icon: Icon, value }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity style={styles.inputWrapper} activeOpacity={0.7}>
      <Icon size={16} color="#cbd5e1" style={styles.iconCenter} />
      <Text style={styles.selectText}>{value}</Text>
      <ChevronDown size={16} color="#94a3b8" style={styles.chevronIcon} />
    </TouchableOpacity>
  </View>
);

// --- Main Screen ---

const AddClientScreen: React.FC = () => {
  const [customerType, setCustomerType] = useState<'Residential' | 'Commercial'>('Residential');
  const [sameAsService, setSameAsService] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn}>
          <X size={20} color="#94a3b8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ADD NEW CLIENT</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
          {/* Customer Type Selector */}
          <View style={styles.typeSelector}>
            {(['Residential', 'Commercial'] as const).map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => setCustomerType(type)}
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
            
            {/* Primary Contact */}
            <Section title="Primary Contact" accent="#2563eb">
              {customerType === 'Commercial' && (
                <InputField label="Company Name" placeholder="e.g. Acme Corp" icon={Building2} required />
              )}
              <View style={styles.row}>
                <View style={{ flex: 1 }}><InputField label="First Name" placeholder="Jane" required /></View>
                <View style={{ flex: 1 }}><InputField label="Last Name" placeholder="Smith" required /></View>
              </View>
              <InputField label="Email Address" placeholder="jane@example.com" icon={Mail} keyboardType="email-address" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}><InputField label="Mobile Phone" placeholder="(555) 000-0000" icon={Phone} keyboardType="phone-pad" required /></View>
                <View style={{ flex: 1 }}><InputField label="Work/Alt Phone" placeholder="(555) 000-0000" keyboardType="phone-pad" /></View>
              </View>
            </Section>

            {/* Service Address */}
            <Section title="Service Address" accent="#10b981">
              <InputField label="Street Address" placeholder="123 Evergreen Terrace" icon={MapPin} required />
              <View style={styles.row}>
                <View style={{ flex: 1 }}><InputField label="City" placeholder="Springfield" /></View>
                <View style={{ flex: 1 }}><InputField label="Zip Code" placeholder="62704" /></View>
              </View>
              
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelGroup}>
                  <View style={styles.checkSquare}>
                    {sameAsService && <Check size={14} color="#2563eb" strokeWidth={4} />}
                  </View>
                  <Text style={styles.toggleText}>Billing address same as service</Text>
                </View>
                <Switch
                  value={sameAsService}
                  onValueChange={setSameAsService}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  ios_backgroundColor="#e2e8f0"
                />
              </View>

              {!sameAsService && (
                <View style={{ marginTop: 12 }}>
                  <InputField label="Billing Address" placeholder="P.O. Box 456" />
                </View>
              )}
            </Section>

            {/* Property & Access */}
            <Section title="Property & Access" accent="#6366f1">
              <View style={styles.row}>
                <View style={{ flex: 1 }}><InputField label="Gate Code" placeholder="#1234" icon={ShieldCheck} /></View>
                <View style={{ flex: 1 }}><SelectField label="Pets" icon={Dog} value="Dog (Friendly)" /></View>
              </View>
              <InputField label="Internal Notes" placeholder="E.g. Beware of loose gravel..." icon={StickyNote} multiline />
            </Section>

          </View>
        </ScrollView>

        {/* Sticky Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.9}>
            <Text style={styles.saveBtnText}>Save Customer</Text>
            <Check size={22} color="white" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  closeBtn: { width: 40, height: 40, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  headerTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', letterSpacing: 2 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 160 },
  typeSelector: { flexDirection: 'row', backgroundColor: '#e2e8f0', padding: 4, borderRadius: 16, marginBottom: 24 },
  typeBtn: { flex: 1, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 },
  typeBtnActive: { backgroundColor: 'white' },
  typeBtnText: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
  typeBtnTextActive: { color: '#2563eb' },
  formContent: { gap: 20 },
  sectionCard: { backgroundColor: 'white', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#f1f5f9', gap: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionIndicator: { width: 6, height: 16, borderRadius: 3 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', letterSpacing: 1, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 4 },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' },
  requiredDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ef4444' },
  inputWrapper: { height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  textAreaWrapper: { height: 100, alignItems: 'flex-start', paddingTop: 12 },
  iconCenter: { marginRight: 12 },
  iconTop: { marginRight: 12, marginTop: 4 },
  textInput: { flex: 1, height: '100%', fontSize: 14, fontWeight: '700', color: '#0f172a' },
  textArea: { textAlignVertical: 'top' },
  selectText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  chevronIcon: { marginLeft: 'auto' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginTop: 12 },
  toggleLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  checkSquare: { width: 32, height: 32, backgroundColor: 'white', borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  toggleText: { fontSize: 11, fontWeight: '800', color: '#64748b', letterSpacing: -0.2 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  saveBtn: { height: 68, backgroundColor: '#2563eb', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 8, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
});

export default AddClientScreen;