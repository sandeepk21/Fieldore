import {
    Calendar,
    Check,
    ChevronDown,
    DollarSign,
    FileText,
    Hash,
    Info,
    LucideIcon,
    Percent,
    Plus,
    Receipt,
    Trash2,
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
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Interfaces ---
interface LineItem {
  id: number;
  name: string;
  qty: number;
  rate: number;
}

interface SectionProps {
  title: string;
  accent: string;
  children: React.ReactNode;
}

interface InputFieldProps {
  label: string;
  placeholder: string;
  icon?: LucideIcon;
  value?: string;
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

const InputField: React.FC<InputFieldProps> = ({ label, placeholder, icon: Icon, value }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputWrapper}>
      {Icon && <Icon size={16} color="#cbd5e1" style={styles.inputIcon} />}
      <TextInput
        style={[styles.textInput, !Icon && { paddingLeft: 16 }]}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        defaultValue={value}
      />
    </View>
  </View>
);

// Added missing SelectField component
const SelectField: React.FC<SelectFieldProps> = ({ label, icon: Icon, value }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TouchableOpacity style={styles.inputWrapper} activeOpacity={0.7}>
      <Icon size={16} color="#cbd5e1" style={styles.inputIcon} />
      <Text style={styles.selectTextInner}>{value}</Text>
      <ChevronDown size={16} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  </View>
);

// --- Main Screen ---

const CreateInvoiceScreen: React.FC = () => {
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, name: 'Service Labor', qty: 4, rate: 85 },
    { id: 2, name: 'Replacement Parts', qty: 1, rate: 120 }
  ]);
  const [taxRate, setTaxRate] = useState<string>('10');
  const [discount, setDiscount] = useState<string>('0');

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  const taxAmount = (subtotal * parseFloat(taxRate || '0')) / 100;
  const total = subtotal + taxAmount - parseFloat(discount || '0');

  const addItem = () => {
    setItems([...items, { id: Date.now(), name: '', qty: 1, rate: 0 }]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: keyof LineItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn}>
          <X size={20} color="#94a3b8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NEW INVOICE</Text>
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
          <View style={styles.billingHeader}>
             <View>
                <View style={styles.titleRow}>
                   <View style={styles.logoBox}>
                      <Receipt size={16} color="white" />
                   </View>
                   <Text style={styles.titleMain}>Billing</Text>
                </View>
                <Text style={styles.titleSub}>Finalize job details to get paid.</Text>
             </View>
             <View style={styles.idCard}>
                <Text style={styles.idLabel}>NO.</Text>
                <Text style={styles.idValue}>#INV-4820</Text>
             </View>
          </View>

          <View style={styles.formContainer}>
            <Section title="Reference Info" accent="#2563eb">
               <View style={styles.inputGroup}>
                  <Text style={styles.label}>CUSTOMER</Text>
                  <TouchableOpacity style={styles.inputWrapper} activeOpacity={0.7}>
                     <View style={styles.miniAvatar}><Text style={styles.avatarText}>SJ</Text></View>
                     <Text style={styles.selectTextInner}>Sarah Johnson</Text>
                     <ChevronDown size={16} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
               </View>
               <View style={styles.row}>
                  <View style={{ flex: 1 }}><InputField label="PO NUMBER" placeholder="e.g. 1042-X" icon={Hash} /></View>
                  <View style={{ flex: 1 }}><SelectField label="NET TERMS" icon={Calendar} value="Net 30" /></View>
               </View>
            </Section>

            <Section title="Timeline" accent="#f59e0b">
               <View style={styles.row}>
                  <View style={{ flex: 1 }}><InputField label="INVOICE DATE" placeholder="Mar 16, 2026" icon={Calendar} /></View>
                  <View style={{ flex: 1 }}><InputField label="DUE DATE" placeholder="Mar 31, 2026" icon={Info} /></View>
               </View>
            </Section>

            <Section title="Line Items" accent="#6366f1">
               <View style={styles.itemsList}>
                  {items.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                       <View style={styles.itemTop}>
                          <TextInput 
                            style={styles.itemNameInput} 
                            placeholder="Service or part name..." 
                            placeholderTextColor="#cbd5e1"
                            defaultValue={item.name}
                            onChangeText={(val) => updateItem(item.id, 'name', val)}
                          />
                          <TouchableOpacity onPress={() => removeItem(item.id)}>
                             <Trash2 size={16} color="#cbd5e1" />
                          </TouchableOpacity>
                       </View>
                       <View style={styles.itemGrid}>
                          <View style={styles.gridCell}>
                             <Text style={styles.gridLabel}>QTY</Text>
                             <TextInput 
                                keyboardType="numeric" 
                                style={styles.gridInput} 
                                defaultValue={item.qty.toString()}
                                onChangeText={(val) => updateItem(item.id, 'qty', parseInt(val) || 0)}
                             />
                          </View>
                          <View style={styles.gridCell}>
                             <Text style={styles.gridLabel}>RATE</Text>
                             <TextInput 
                                keyboardType="numeric" 
                                style={styles.gridInput} 
                                defaultValue={item.rate.toString()}
                                onChangeText={(val) => updateItem(item.id, 'rate', parseInt(val) || 0)}
                             />
                          </View>
                          <View style={[styles.gridCell, { alignItems: 'flex-end' }]}>
                             <Text style={styles.gridLabel}>TOTAL</Text>
                             <Text style={styles.itemTotalText}>${(item.qty * item.rate).toLocaleString()}</Text>
                          </View>
                       </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
                     <Plus size={14} color="#94a3b8" />
                     <Text style={styles.addItemText}>ADD NEW LINE ITEM</Text>
                  </TouchableOpacity>
               </View>
            </Section>

            <Section title="Notes & Terms" accent="#94a3b8">
               <View style={styles.notesWrapper}>
                  <FileText size={16} color="#cbd5e1" style={styles.notesIcon} />
                  <TextInput
                    style={styles.notesArea}
                    placeholder="E.g. Late fees apply after 30 days..."
                    placeholderTextColor="#cbd5e1"
                    multiline
                  />
               </View>
            </Section>
          </View>
        </ScrollView>

        <View style={styles.footer}>
           <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                 <Text style={styles.summaryLabel}>SUBTOTAL</Text>
                 <Text style={styles.summaryValue}>${subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                 <View style={styles.calcInputRow}>
                    <Text style={styles.summaryLabel}>TAX RATE</Text>
                    <View style={styles.miniInputBox}>
                       <TextInput 
                        style={styles.miniInput} 
                        keyboardType="numeric" 
                        value={taxRate}
                        onChangeText={setTaxRate}
                       />
                       <Percent size={10} color="#2563eb" />
                    </View>
                 </View>
                 <Text style={styles.summaryValue}>+${taxAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                 <View style={styles.calcInputRow}>
                    <Text style={[styles.summaryLabel, { color: '#ef4444' }]}>DISCOUNT</Text>
                    <View style={[styles.miniInputBox, { backgroundColor: '#fef2f2' }]}>
                       <DollarSign size={10} color="#ef4444" />
                       <TextInput 
                        style={[styles.miniInput, { color: '#ef4444' }]} 
                        keyboardType="numeric" 
                        value={discount}
                        onChangeText={setDiscount}
                       />
                    </View>
                 </View>
                 <Text style={[styles.summaryValue, { color: '#ef4444' }]}>-${parseFloat(discount || '0').toLocaleString()}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.totalRow}>
                 <Text style={styles.totalLabel}>Total Balance</Text>
                 <Text style={styles.totalValue}>${total.toLocaleString()}</Text>
              </View>
           </View>

           <TouchableOpacity style={styles.createBtn} activeOpacity={0.9}>
              <Text style={styles.createBtnText}>Create & Send Invoice</Text>
              <Check size={22} color="white" strokeWidth={3} />
           </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 60, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  closeBtn: { width: 40, height: 40, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  headerTitle: { fontSize: 12, fontWeight: '900', color: '#cbd5e1', letterSpacing: 2 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 380 }, // Increased padding for footer
  billingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  logoBox: { width: 32, height: 32, backgroundColor: '#2563eb', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  titleMain: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  titleSub: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  idCard: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  idLabel: { fontSize: 10, fontWeight: '900', color: '#cbd5e1' },
  idValue: { fontSize: 14, fontWeight: '900', color: '#2563eb' },
  formContainer: { gap: 20 },
  sectionCard: { backgroundColor: 'white', padding: 20, borderRadius: 32, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionIndicator: { width: 6, height: 16, borderRadius: 3 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { gap: 6, marginBottom: 12 },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', marginLeft: 4 },
  inputWrapper: { height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  miniAvatar: { width: 24, height: 24, backgroundColor: '#eff6ff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '900', color: '#2563eb' },
  selectTextInner: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginLeft: 12 },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, height: '100%', fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemsList: { gap: 12 },
  itemCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemNameInput: { flex: 1, fontSize: 14, fontWeight: '900', color: '#0f172a' }, // Fixed outlineStyle error
  itemGrid: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  gridCell: { flex: 1, gap: 4 },
  gridLabel: { fontSize: 9, fontWeight: '900', color: '#cbd5e1' },
  gridInput: { backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 8, height: 32, fontSize: 12, fontWeight: '800', color: '#0f172a', borderWidth: 1, borderColor: '#f1f5f9' },
  itemTotalText: { fontSize: 13, fontWeight: '900', color: '#0f172a', marginTop: 6 },
  addItemBtn: { height: 56, borderStyle: 'dashed', borderWidth: 2, borderColor: '#f1f5f9', borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  addItemText: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
  notesWrapper: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  notesIcon: { marginRight: 12, marginTop: 2 },
  notesArea: { flex: 1, fontSize: 12, fontWeight: '700', color: '#0f172a', textAlignVertical: 'top' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 24, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  summaryBox: { gap: 8, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8' },
  summaryValue: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
  calcInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 6, height: 26 },
  miniInput: { width: 25, fontSize: 11, fontWeight: '900', color: '#2563eb', textAlign: 'center', padding: 0 },
  summaryDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  totalValue: { fontSize: 26, fontWeight: '900', color: '#2563eb' },
  createBtn: { height: 64, backgroundColor: '#2563eb', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  createBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
});

export default CreateInvoiceScreen;