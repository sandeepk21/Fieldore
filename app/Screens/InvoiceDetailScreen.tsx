import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    Clock,
    CreditCard,
    Download,
    ExternalLink,
    FileText,
    LucideIcon,
    Mail,
    MapPin,
    MoreVertical,
    Send,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Types & Interfaces ---
type InvoiceStatus = 'Paid' | 'Unpaid' | 'Overdue';

interface InvoiceItem {
  id: number;
  name: string;
  desc: string;
  qty: number;
  price: number;
}

interface InvoiceData {
  number: string;
  date: string;
  dueDate: string;
  customer: {
    name: string;
    email: string;
    address: string;
    initials: string;
  };
  items: InvoiceItem[];
  taxRate: number;
  discount: number;
}

interface StatusConfig {
  color: string;
  bg: string;
  icon: LucideIcon;
}

// --- Main Component ---
const InvoiceDetailScreen: React.FC = () => {
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('Unpaid');

  const invoice: InvoiceData = {
    number: "INV-2045",
    date: "Mar 11, 2026",
    dueDate: "Mar 25, 2026",
    customer: {
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      address: "742 Evergreen Terrace, Springfield",
      initials: "SJ"
    },
    items: [
      { id: 1, name: "Bathroom Leak Repair", desc: "Labor and diagnostics", qty: 1, price: 280.00 },
      { id: 2, name: "Copper Piping", desc: "Industrial grade 1/2 inch", qty: 4, price: 45.00 },
      { id: 3, name: "Emergency Call-out Fee", desc: "After hours service", qty: 1, price: 120.00 }
    ],
    taxRate: 0.10,
    discount: 50.00
  };

  const subtotal = invoice.items.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const tax = subtotal * invoice.taxRate;
  const total = subtotal + tax - invoice.discount;

  const getStatusConfig = (): StatusConfig => {
    switch (invoiceStatus) {
      case 'Paid': return { color: '#10b981', bg: '#ecfdf5', icon: CheckCircle2 };
      case 'Overdue': return { color: '#f43f5e', bg: '#fef2f2', icon: AlertCircle };
      default: return { color: '#d97706', bg: '#fffbe6', icon: Clock };
    }
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header Nav */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn}>
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.invoiceID}>{invoice.number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <StatusIcon size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{invoiceStatus.toUpperCase()}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerBtn}>
          <MoreVertical size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        
        {/* Customer Detail Card */}
        <View style={styles.customerSection}>
          <View style={styles.customerInfoRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{invoice.customer.initials}</Text>
            </View>
            <View style={styles.customerTextContainer}>
              <Text style={styles.customerName}>{invoice.customer.name}</Text>
              <View style={styles.emailRow}>
                <Mail size={14} color="#cbd5e1" />
                <Text style={styles.customerEmail}>{invoice.customer.email}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.addressBox} activeOpacity={0.7}>
            <MapPin size={16} color="#cbd5e1" />
            <Text style={styles.addressText}>{invoice.customer.address}</Text>
            <ExternalLink size={14} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {/* Metadata Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>ISSUE DATE</Text>
            <Text style={styles.metaValue}>{invoice.date}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>DUE DATE</Text>
            <Text style={styles.metaValue}>{invoice.dueDate}</Text>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsTitle}>ITEMIZED SERVICES</Text>
            <FileText size={16} color="#cbd5e1" />
          </View>

          {invoice.items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDesc}>{item.desc}</Text>
                </View>
                <Text style={styles.itemPrice}>${(item.qty * item.price).toLocaleString()}</Text>
              </View>
              <View style={styles.itemBottomRow}>
                <View style={styles.itemBadge}><Text style={styles.itemBadgeText}>Qty: {item.qty}</Text></View>
                <View style={styles.itemBadge}><Text style={styles.itemBadgeText}>Rate: ${item.price}</Text></View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Summary Footer */}
      <View style={styles.footer}>
        <View style={styles.summaryBreakdown}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>SUBTOTAL</Text>
            <Text style={styles.summaryValue}>${subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>TAX (10%)</Text>
            <Text style={styles.summaryValue}>+${tax.toLocaleString()}</Text>
          </View>
          {invoice.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#f43f5e' }]}>DISCOUNT</Text>
              <Text style={[styles.summaryValue, { color: '#f43f5e' }]}>-${invoice.discount.toLocaleString()}</Text>
            </View>
          )}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
            <Text style={styles.totalValue}>${total.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.actionArea}>
          <View style={styles.btnRow}>
            <TouchableOpacity 
              style={styles.paymentBtn} 
              onPress={() => setInvoiceStatus('Paid')}
              activeOpacity={0.8}
            >
              <CreditCard size={18} color="white" />
              <Text style={styles.paymentBtnText}>Record Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.downloadBtn}>
              <Download size={20} color="white" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.sendBtn} activeOpacity={0.9}>
            <Text style={styles.sendBtnText}>Send Invoice</Text>
            <Send size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollPadding: { paddingBottom: 320 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  headerBtn: { width: 40, height: 40, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { alignItems: 'center' },
  invoiceID: { fontSize: 10, fontWeight: '900', color: '#cbd5e1', letterSpacing: 1.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusText: { fontSize: 10, fontWeight: '900' },
  customerSection: { padding: 24 },
  customerInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatar: { width: 64, height: 64, backgroundColor: '#2563eb', borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '900', color: 'white' },
  customerTextContainer: { flex: 1 },
  customerName: { fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  customerEmail: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  addressBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 24, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  addressText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#64748b', lineHeight: 18 },
  metaGrid: { flexDirection: 'row', paddingHorizontal: 24, gap: 16, marginBottom: 32 },
  metaCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  metaLabel: { fontSize: 10, fontWeight: '900', color: '#cbd5e1', letterSpacing: 1, marginBottom: 4 },
  metaValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemsSection: { paddingHorizontal: 24 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  itemsTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', letterSpacing: 1 },
  itemCard: { backgroundColor: 'white', padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemDesc: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '500' },
  itemPrice: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  itemBottomRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 12 },
  itemBadge: { backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  itemBadgeText: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  summaryBreakdown: { marginBottom: 24, paddingHorizontal: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  summaryValue: { fontSize: 12, fontWeight: '900', color: '#0f172a' },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  totalLabel: { fontSize: 13, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 },
  totalValue: { fontSize: 24, fontWeight: '900', color: '#2563eb' },
  actionArea: { gap: 12 },
  btnRow: { flexDirection: 'row', gap: 12 },
  paymentBtn: { flex: 1, height: 56, backgroundColor: '#10b981', borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  paymentBtnText: { color: 'white', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  downloadBtn: { width: 56, height: 56, backgroundColor: '#0f172a', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { height: 64, backgroundColor: '#2563eb', borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  sendBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
});

export default InvoiceDetailScreen;