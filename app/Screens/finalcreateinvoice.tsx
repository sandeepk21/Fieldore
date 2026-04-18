import {
    Banknote,
    Briefcase,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Eye,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    User,
    X
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_CUSTOMERS = [
  { id: '1', name: 'Riverside Properties', email: 'robert@riverside.com', address: '456 Green Valley Rd, Austin, TX' },
  { id: '2', name: 'Oak Hill Estate', email: 'contact@oakhill.com', address: '100 Business Pkwy, Dallas, TX' },
  { id: '3', name: 'Blue Ridge Lawns', email: 'info@blueridge.com.au', address: 'Sydney, AU' },
];

const MOCK_JOBS = [
  { id: 'JOB-042', ref: 'INV-2026-042', title: 'Sod Installation (850 sq ft)', status: 'InProgress' },
  { id: 'JOB-045', ref: 'INV-2026-045', title: 'Garden Redesign', status: 'Completed' },
  { id: 'JOB-051', ref: 'INV-2026-051', title: 'Monthly Maintenance', status: 'Scheduled' },
];

const formatUSD = (amount) => {
  return `$${(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

export default function CreateInvoiceScreen() {
  const [activeModal, setActiveModal] = useState(null); // 'customer' | 'job' | 'preview'
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [customer, setCustomer] = useState(null);
  const [job, setJob] = useState(null);
  const [items, setItems] = useState([
    { id: '1', name: 'Premium Bermuda Sod', qty: 1500, price: 1.25 },
  ]);
  const [taxRate, setTaxRate] = useState(8.25);
  const [paymentMethod, setPaymentMethod] = useState('Online Pay');

  // Calculations
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.qty * item.price), 0), [items]);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  // Handlers
  const addItem = () => setItems([...items, { id: Math.random().toString(), name: '', qty: 1, price: 0 }]);
  const removeItem = (id) => items.length > 1 && setItems(items.filter(i => i.id !== id));
  const updateItem = (id, field, val) => setItems(items.map(i => i.id === id ? { ...i, [field]: val } : i));

  const filteredCustomers = MOCK_CUSTOMERS.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredJobs = MOCK_JOBS.filter(j => j.title.toLowerCase().includes(searchQuery.toLowerCase()) || j.id.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <ChevronLeft size={20} color="#64748b" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Create Invoice</Text>
          <Text style={styles.headerSubtitle}>SINGLE ENTRY</Text>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <MoreHorizontal size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SECTION 1: CUSTOMER & JOB */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTEXT</Text>
          
          <TouchableOpacity style={styles.card} onPress={() => { setActiveModal('customer'); setSearchQuery(''); }}>
            <View style={styles.cardRow}>
              <View style={[styles.iconBox, customer ? styles.iconBoxActiveBlue : styles.iconBoxInactive]}>
                <User size={22} color={customer ? "#2563eb" : "#cbd5e1"} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle} numberOfLines={1}>{customer?.name || "Select Customer"}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{customer?.email || "Required info"}</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => { setActiveModal('job'); setSearchQuery(''); }}>
            <View style={styles.cardRow}>
              <View style={[styles.iconBox, job ? styles.iconBoxActiveAmber : styles.iconBoxInactive]}>
                <Briefcase size={22} color={job ? "#d97706" : "#cbd5e1"} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle} numberOfLines={1}>{job?.id || "Link Reference"}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{job?.title || "Optional link"}</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* SECTION 2: SERVICES & ITEMS */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>SERVICES & ITEMS</Text>
            <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
              <Plus size={16} color="#2563eb" />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <TextInput 
                  style={styles.itemNameInput}
                  value={item.name}
                  onChangeText={val => updateItem(item.id, 'name', val)}
                  placeholder="Service Name..."
                  placeholderTextColor="#e2e8f0"
                />
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Trash2 size={18} color="#e2e8f0" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.itemInputsRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>QUANTITY</Text>
                  <TextInput 
                    style={styles.numberInput}
                    keyboardType="numeric"
                    value={item.qty.toString()}
                    onChangeText={val => updateItem(item.id, 'qty', parseFloat(val) || 0)}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>RATE ($)</Text>
                  <TextInput 
                    style={styles.numberInput}
                    keyboardType="numeric"
                    value={item.price.toString()}
                    onChangeText={val => updateItem(item.id, 'price', parseFloat(val) || 0)}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* SECTION 3: CALCULATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CALCULATION</Text>
          <View style={styles.calcCard}>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Subtotal</Text>
              <Text style={styles.calcValue}>{formatUSD(subtotal)}</Text>
            </View>
            <View style={styles.calcRow}>
              <View style={styles.taxRowLeft}>
                <Text style={styles.calcLabel}>Sales Tax</Text>
                <View style={styles.taxInputContainer}>
                  <TextInput 
                    style={styles.taxInput}
                    keyboardType="numeric"
                    value={taxRate.toString()}
                    onChangeText={val => setTaxRate(parseFloat(val) || 0)}
                  />
                  <Text style={styles.taxPercentSymbol}>%</Text>
                </View>
              </View>
              <Text style={styles.calcValueBold}>{formatUSD(taxAmount)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.calcGrandRow}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
              <Text style={styles.grandTotalValue}>{formatUSD(total)}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 4: PAYMENT METHOD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
          <View style={styles.paymentRow}>
            {['Online Pay', 'Cash'].map(method => {
              const isSelected = paymentMethod === method;
              return (
                <TouchableOpacity 
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={[styles.paymentBtn, isSelected ? styles.paymentBtnActive : styles.paymentBtnInactive]}
                >
                  {method === 'Online Pay' 
                    ? <CreditCard size={18} color={isSelected ? "#FFF" : "#64748b"} /> 
                    : <Banknote size={18} color={isSelected ? "#FFF" : "#64748b"} />}
                  <Text style={isSelected ? styles.paymentTextActive : styles.paymentTextInactive}>
                    {method}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* SECTION 5: ACTIONS */}
        <TouchableOpacity style={styles.previewBtn} onPress={() => setActiveModal('preview')}>
          <Eye size={18} color="#FFF" />
          <Text style={styles.previewBtnText}>Preview PDF Document</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* FIXED BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarTextContainer}>
          <Text style={styles.bottomBarLabel}>AMOUNT DUE</Text>
          <Text style={styles.bottomBarValue}>{formatUSD(total)}</Text>
        </View>
        <TouchableOpacity style={styles.sendBtn}>
          <CheckCircle2 size={20} color="#FFF" strokeWidth={3} />
          <Text style={styles.sendBtnText}>Send Invoice</Text>
        </TouchableOpacity>
      </View>

      {/* ─── MODALS ─── */}
      
      {/* CUSTOMER MODAL */}
      {activeModal === 'customer' && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
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
              {filteredCustomers.map(c => (
                <TouchableOpacity key={c.id} style={styles.modalListItem} onPress={() => { setCustomer(c); setActiveModal(null); }}>
                  <View style={styles.modalListItemLeft}>
                    <View style={styles.avatarLetter}>
                      <Text style={styles.avatarLetterText}>{c.name.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.modalListTitle}>{c.name}</Text>
                      <Text style={styles.modalListSubtitle}>{c.email}</Text>
                    </View>
                  </View>
                  {customer?.id === c.id && (
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

      {/* JOB MODAL */}
      {activeModal === 'job' && (
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Job</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
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
              {filteredJobs.map(j => (
                <TouchableOpacity key={j.id} style={styles.modalListItem} onPress={() => { setJob(j); setActiveModal(null); }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobRefId}>{j.id}</Text>
                    <Text style={styles.modalListTitle}>{j.title}</Text>
                    <View style={styles.jobStatusRow}>
                      <View style={styles.statusDot} />
                      <Text style={styles.jobStatusText}>{j.status}</Text>
                    </View>
                  </View>
                  {job?.id === j.id && (
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

      {/* PREVIEW MODAL */}
      {activeModal === 'preview' && (
        <View style={styles.previewBackdrop}>
          <View style={styles.previewSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice Preview</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeBtn}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.previewPaperContainer}>
              <ScrollView style={styles.previewPaper}>
                <View style={styles.previewHeaderRow}>
                  <Text style={styles.previewLogo}>GREENSPACE.</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.previewSmallLabel}>INV #</Text>
                    <Text style={styles.previewInvNumber}>INV-2026-0089</Text>
                  </View>
                </View>

                <View style={styles.previewMetaRow}>
                  <View>
                    <Text style={styles.previewSmallLabel}>BILL TO</Text>
                    <Text style={styles.previewClientName}>{customer?.name || "Client Name"}</Text>
                    <Text style={styles.previewClientEmail}>{customer?.email || "Email"}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.previewSmallLabel}>DATE</Text>
                    <Text style={styles.previewDate}>{new Date().toLocaleDateString('en-US')}</Text>
                  </View>
                </View>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={styles.thLeft}>DESCRIPTION</Text>
                  <Text style={styles.thRight}>TOTAL</Text>
                </View>

                {/* Table Body */}
                <View style={styles.tableBody}>
                  {items.map(i => (
                    <View key={i.id} style={styles.tableRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tdTitle}>{i.name || "Unnamed Service"}</Text>
                        <Text style={styles.tdSub}>{i.qty} units @ {formatUSD(i.price)}</Text>
                      </View>
                      <Text style={styles.tdTotal}>{formatUSD(i.qty * i.price)}</Text>
                    </View>
                  ))}
                </View>

                {/* Table Footer / Totals */}
                <View style={styles.previewTotals}>
                  <View style={styles.previewTotalRow}>
                    <Text style={styles.previewTotalLabel}>SUBTOTAL</Text>
                    <Text style={styles.previewTotalValue}>{formatUSD(subtotal)}</Text>
                  </View>
                  <View style={styles.previewTotalRow}>
                    <Text style={styles.previewTotalLabel}>TAX ({taxRate}%)</Text>
                    <Text style={styles.previewTotalValue}>{formatUSD(taxAmount)}</Text>
                  </View>
                  <View style={[styles.previewTotalRow, { marginTop: 8 }]}>
                    <Text style={styles.previewGrandLabel}>BALANCE DUE</Text>
                    <Text style={styles.previewGrandValue}>{formatUSD(total)}</Text>
                  </View>
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.shareBtn}>
              <Text style={styles.shareBtnText}>SHARE INVOICE</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

// ─── STYLESHEET ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  headerTitleContainer: {
    alignItems: 'center',
  },
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 160, // Space for bottom bar
  },
  section: {
    marginBottom: 32,
  },
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
    fontWeight: 'bold',
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
  cardTextContainer: {
    flex: 1,
  },
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
    marginBottom: 16,
  },
  itemNameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginRight: 16,
    padding: 0,
  },
  itemInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    flex: 1,
    marginRight: 16,
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
    fontWeight: 'bold',
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
    width: 40,
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
  bottomBarTextContainer: {
    flex: 1,
  },
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
  
  // MODAL STYLES
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
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
  modalScroll: {
    flex: 1,
  },
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
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },

  // PREVIEW MODAL SPECIFIC
  previewBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
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
    marginBottom: 40,
  },
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
  tableBody: {
    marginBottom: 40,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tdTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  tdSub: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
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
    fontWeight: 'bold',
    color: '#94a3b8',
  },
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
  }
});