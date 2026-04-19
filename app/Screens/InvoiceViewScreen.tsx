import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Download,
  MoreVertical,
  Send,
  Share2,
  Smartphone,
  Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Types ---
type InvoiceStatus = 'Draft' | 'Sent' | 'Viewed' | 'Partially Paid' | 'Paid' | 'Overdue';

interface InvoiceParty {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
}

interface LineItem {
  id: string;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxable: boolean;
}

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  actor?: string;
}

// --- Helpers ---
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// --- Components ---
interface HeaderActionProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

const HeaderAction: React.FC<HeaderActionProps> = ({ icon, label, onPress, variant = 'secondary' }) => (
  <TouchableOpacity
    style={[styles.headerAction, variant === 'primary' && styles.headerActionPrimary]}
    onPress={onPress}
  >
    {icon}
    <Text
      style={[
        styles.headerActionText,
        variant === 'primary' && styles.headerActionTextPrimary,
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

interface StatusBadgeProps {
  status: InvoiceStatus;
  amountDue?: number;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, amountDue }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'Draft':
        return { bg: '#f3f4f6', text: '#6b7280', icon: '📝' };
      case 'Sent':
        return { bg: '#dbeafe', text: '#0284c7', icon: '✉️' };
      case 'Viewed':
        return { bg: '#e0e7ff', text: '#4f46e5', icon: '👁️' };
      case 'Partially Paid':
        return { bg: '#fef3c7', text: '#d97706', icon: '⏳' };
      case 'Paid':
        return { bg: '#dcfce7', text: '#16a34a', icon: '✓' };
      case 'Overdue':
        return { bg: '#fee2e2', text: '#dc2626', icon: '⚠️' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', icon: '•' };
    }
  };

  const style = getStatusStyle();

  return (
    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
      <Text style={styles.statusIcon}>{style.icon}</Text>
      <View>
        <Text style={[styles.statusLabel, { color: style.text }]}>{status}</Text>
        {amountDue !== undefined && amountDue > 0 && (
          <Text style={[styles.statusAmount, { color: style.text }]}>
            {formatCurrency(amountDue)} due
          </Text>
        )}
      </View>
    </View>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children, rightElement }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rightElement}
    </View>
    {children}
  </View>
);

interface PartyBlockProps {
  label: string;
  party: InvoiceParty;
}

const PartyBlock: React.FC<PartyBlockProps> = ({ label, party }) => (
  <View style={styles.partyBlock}>
    <Text style={styles.partyLabel}>{label}</Text>
    <Text style={styles.partyName}>{party.companyName || party.contactName}</Text>
    <Text style={styles.partyDetail}>{party.contactName}</Text>
    <Text style={styles.partyDetail}>{party.address}</Text>
    <Text style={styles.partyDetail}>{party.email}</Text>
    <Text style={styles.partyDetail}>{party.phone}</Text>
    {party.taxId && <Text style={styles.partyDetail}>Tax ID: {party.taxId}</Text>}
  </View>
);

interface LineItemRowProps {
  item: LineItem;
}

const LineItemRow: React.FC<LineItemRowProps> = ({ item }) => (
  <View style={styles.lineItemRow}>
    <View style={styles.lineItemContent}>
      <Text style={styles.lineItemTitle}>{item.title}</Text>
      {item.description && <Text style={styles.lineItemDesc}>{item.description}</Text>}
    </View>
    <View style={styles.lineItemRight}>
      <Text style={styles.lineItemQty}>
        {item.quantity} {item.unit}
      </Text>
      <Text style={styles.lineItemTotal}>{formatCurrency(item.quantity * item.unitPrice)}</Text>
    </View>
  </View>
);

interface ActivityItemProps {
  activity: ActivityLog;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => (
  <View style={styles.activityItem}>
    <View style={styles.activityDot} />
    <View style={styles.activityContent}>
      <View style={styles.activityHeader}>
        <Text style={styles.activityAction}>{activity.action}</Text>
        <Text style={styles.activityTime}>{formatDate(activity.timestamp)}</Text>
      </View>
      <Text style={styles.activityDescription}>{activity.description}</Text>
    </View>
  </View>
);

// --- Main Component ---
const InvoiceViewScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const invoiceId = params.invoiceId as string || '1';

  // Mock invoice data
  const invoice = {
    id: invoiceId,
    number: 'INV-2026-0482',
    status: 'Partially Paid' as InvoiceStatus,
    issueDate: '2026-04-05',
    dueDate: '2026-04-20',
    currency: 'USD',

    business: {
      companyName: 'Fieldore Services Co.',
      contactName: 'Sandy Sharma',
      email: 'billing@fieldore.app',
      phone: '+1 555 0100',
      address: '12 Service Lane, New York, NY 10001',
      taxId: 'EIN 12-3456789',
    } as InvoiceParty,

    customer: {
      companyName: 'Johnson Homes Inc.',
      contactName: 'Sarah Johnson',
      email: 'sarah@johnsonhomes.com',
      phone: '+1 555 0101',
      address: '742 Evergreen Drive, Boston, MA 02101',
      taxId: 'Tax ID: 98-7654321',
    } as InvoiceParty,

    items: [
      {
        id: '1',
        title: 'Emergency Plumbing Labor',
        description: 'Leak detection, repair, pressure testing, and site cleanup.',
        quantity: 4,
        unit: 'hrs',
        unitPrice: 150,
        taxable: true,
      },
      {
        id: '2',
        title: 'Copper Valve Replacement Kit',
        description: 'Premium fittings and replacement materials for kitchen line.',
        quantity: 2,
        unit: 'pcs',
        unitPrice: 250,
        taxable: true,
      },
      {
        id: '3',
        title: 'Site Visit and Handover',
        description: 'Final testing, inspection report, and customer walkthrough.',
        quantity: 1,
        unit: 'visit',
        unitPrice: 150,
        taxable: false,
      },
    ] as LineItem[],

    subtotal: 1450,
    taxRate: 8,
    taxAmount: 116,
    discount: 50,
    grandTotal: 1516,
    amountPaid: 606.4,
    amountDue: 909.6,

    payments: [
      {
        id: 'p1',
        amount: 606.4,
        date: '2026-04-06',
        method: 'UPI',
        reference: 'UPI-123456789',
      },
    ] as PaymentRecord[],

    activity: [
      {
        id: 'a1',
        action: 'Invoice created',
        description: 'Draft prepared from completed service job JOB-PL-2031.',
        timestamp: '2026-04-05T10:05:00',
        actor: 'You',
      },
      {
        id: 'a2',
        action: 'Invoice sent',
        description: 'Shared with customer by email.',
        timestamp: '2026-04-05T10:25:00',
        actor: 'You',
      },
      {
        id: 'a3',
        action: 'Viewed',
        description: 'Customer viewed the invoice.',
        timestamp: '2026-04-05T14:35:00',
      },
      {
        id: 'a4',
        action: 'Payment received',
        description: 'Partial payment of $606.40 received via UPI.',
        timestamp: '2026-04-06T09:15:00',
      },
    ] as ActivityLog[],
  };

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleSendEmail = () => {
    Alert.alert('Send Invoice', 'Email sent to sarah@johnsonhomes.com', [{ text: 'OK' }]);
  };

  const handleShareLink = () => {
    Alert.alert('Share Link', 'Payment link copied to clipboard!', [{ text: 'OK' }]);
  };

  const handleDownloadPDF = () => {
    Alert.alert('Download', 'PDF downloading...', [{ text: 'OK' }]);
  };

  const handleRecordPayment = () => {
    Alert.alert('Record Payment', 'Would you like to record another payment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add Payment', style: 'default' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerSubtitle}>INVOICE</Text>
          <Text style={styles.headerInvoiceNum}>{invoice.number}</Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowMoreMenu(!showMoreMenu)}
        >
          <MoreVertical size={24} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Status & Amount Section */}
        <View style={styles.topSection}>
          <StatusBadge status={invoice.status} amountDue={invoice.amountDue} />

          <View style={styles.amountCard}>
            <View style={styles.amountCardContent}>
              <Text style={styles.amountLabel}>Grand Total</Text>
              <Text style={styles.amountValue}>{formatCurrency(invoice.grandTotal)}</Text>
            </View>
            {invoice.amountDue > 0 && (
              <TouchableOpacity
                style={styles.amountButton}
                onPress={handleRecordPayment}
              >
                <Zap size={18} color="white" />
                <Text style={styles.amountButtonText}>Pay</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <HeaderAction
            icon={<Send size={16} color="#2563eb" />}
            label="Send"
            onPress={handleSendEmail}
            variant="primary"
          />
          <HeaderAction
            icon={<Share2 size={16} color="#64748b" />}
            label="Share Link"
            onPress={handleShareLink}
          />
          <HeaderAction
            icon={<Download size={16} color="#64748b" />}
            label="Download"
            onPress={handleDownloadPDF}
          />
        </View>

        {/* Invoice Dates */}
        <Section title="Invoice Details">
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Issue Date</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Due Date</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
          </View>
        </Section>

        {/* Party Info */}
        <Section title="Parties">
          <View style={styles.partiesContainer}>
            <PartyBlock label="Bill From" party={invoice.business} />
            <PartyBlock label="Bill To" party={invoice.customer} />
          </View>
        </Section>

        {/* Line Items */}
        <Section title="Items">
          <View style={styles.itemsContainer}>
            <View style={styles.itemsHeader}>
              <Text style={styles.itemsHeaderLabel}>Description</Text>
              <Text style={styles.itemsHeaderValue}>Amount</Text>
            </View>
            {invoice.items.map((item) => (
              <LineItemRow key={item.id} item={item} />
            ))}
          </View>
        </Section>

        {/* Totals */}
        <Section title="Summary">
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.taxAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax ({invoice.taxRate}%)</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.taxAmount)}</Text>
              </View>
            )}
            {invoice.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>
                  -{formatCurrency(invoice.discount)}
                </Text>
              </View>
            )}
            <View style={[styles.totalRow, styles.totalRowHighlight]}>
              <Text style={styles.totalLabelBold}>Grand Total</Text>
              <Text style={styles.totalValueBold}>{formatCurrency(invoice.grandTotal)}</Text>
            </View>
          </View>
        </Section>

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <Section title="Payments Received">
            {invoice.payments.map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentLeft}>
                  <Text style={styles.paymentMethod}>{payment.method}</Text>
                  <Text style={styles.paymentRef}>{payment.reference}</Text>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                </View>
              </View>
            ))}
            {invoice.amountDue > 0 && (
              <View style={styles.amountDueBox}>
                <Text style={styles.amountDueLabel}>Amount Due</Text>
                <Text style={styles.amountDueValue}>{formatCurrency(invoice.amountDue)}</Text>
              </View>
            )}
          </Section>
        )}

        {/* Activity Log */}
        <Section title="Activity Timeline">
          <View style={styles.activityContainer}>
            {invoice.activity.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </View>
        </Section>

        {/* Footer info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Questions? Contact us at billing@fieldore.app
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Action Bar */}
      <View style={styles.stickyActions}>
        <TouchableOpacity
          style={styles.stickyActionBtn}
          onPress={handleSendEmail}
        >
          <Send size={18} color="#2563eb" />
          <Text style={styles.stickyActionText}>Send Invoice</Text>
        </TouchableOpacity>
        {invoice.amountDue > 0 && (
          <TouchableOpacity
            style={[styles.stickyActionBtn, styles.stickyActionBtnPrimary]}
            onPress={handleRecordPayment}
          >
            <Smartphone size={18} color="white" />
            <Text style={styles.stickyActionTextPrimary}>Record Payment</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    alignItems: 'center',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerInvoiceNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  topSection: {
    marginBottom: 20,
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
  },
  statusIcon: {
    fontSize: 20,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusAmount: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  amountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  amountCardContent: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  amountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  amountButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  headerAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerActionPrimary: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  headerActionTextPrimary: {
    color: '#ffffff',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  partiesContainer: {
    gap: 16,
  },
  partyBlock: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  partyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  itemsContainer: {
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
  itemsHeaderLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  itemsHeaderValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    textAlign: 'right',
    minWidth: 80,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  lineItemContent: {
    flex: 1,
    marginRight: 12,
  },
  lineItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  lineItemDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  lineItemRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  lineItemQty: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },
  lineItemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  totalsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRowHighlight: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  totalLabelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  paymentLeft: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  paymentRef: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 2,
  },
  amountDueBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  amountDueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  amountDueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: 2,
  },
  activityContainer: {
    gap: 0,
  },
  activityItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginTop: 6,
    marginLeft: -6,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityAction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  activityTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  activityDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  footerInfo: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
  },
  stickyActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  stickyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  stickyActionBtnPrimary: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  stickyActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  stickyActionTextPrimary: {
    color: '#ffffff',
  },
});

export default InvoiceViewScreen;
