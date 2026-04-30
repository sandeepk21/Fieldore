import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Briefcase,
  ChevronLeft,
  Eye,
  Mail,
  MapPin,
  PenSquare
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InvoiceResponse } from '@/src/api/generated';
import {
  formatInvoiceCurrency,
  formatInvoiceStatusLabel,
  getInvoiceByIdApi,
  getInvoiceStatusTone,
  updateInvoiceStatusApi,
} from '@/src/services/invoiceService';

const STATUS_ACTIONS = ['Draft', 'Sent', 'Viewed', 'Partially Paid', 'Paid', 'Overdue'] as const;

const formatDisplayDate = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatAddress = (invoice?: InvoiceResponse | null) => {
  const parts = [
    invoice?.billingAddress?.line1?.trim(),
    invoice?.billingAddress?.line2?.trim(),
    invoice?.billingAddress?.city?.trim(),
    invoice?.billingAddress?.stateOrProvince?.trim(),
    invoice?.billingAddress?.postalCode?.trim(),
    invoice?.billingAddress?.country?.trim(),
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : 'No billing address';
};

const getCustomerName = (invoice?: InvoiceResponse | null) =>
  invoice?.customer?.displayName?.trim() ||
  invoice?.customerNameSnapshot?.trim() ||
  'Unnamed customer';

const getInvoiceNumber = (invoice?: InvoiceResponse | null) =>
  invoice?.invoiceNumber?.trim() || invoice?.id || 'Invoice';

const InvoiceDetailScreen: React.FC = () => {
  const params = useLocalSearchParams<{ invoiceId?: string }>();
  const invoiceId = typeof params.invoiceId === 'string' ? params.invoiceId : '';

  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      setError('Invoice id is missing.');
      setInvoice(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await getInvoiceByIdApi(invoiceId);
      setInvoice(response);
    } catch (loadError: any) {
      setInvoice(null);
      setError(loadError?.message || 'Failed to load invoice.');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useFocusEffect(
    useCallback(() => {
      loadInvoice();
    }, [loadInvoice])
  );

  const currentStatus = formatInvoiceStatusLabel(invoice?.status);
  const statusTone = useMemo(() => getInvoiceStatusTone(invoice?.status), [invoice?.status]);
  const subtotal = invoice?.subtotalAmount || 0;
  const taxAmount = invoice?.taxAmount || 0;
  const totalAmount = invoice?.totalAmount || 0;
  const balanceDueAmount = invoice?.balanceDueAmount ?? totalAmount;

  const handleStatusUpdate = async (status: string) => {
    if (!invoiceId || status === currentStatus) return;

    setUpdatingStatus(status);
    try {
      const response = await updateInvoiceStatusApi(invoiceId, { status });
      setInvoice(response);
      Alert.alert('Success', `Invoice status updated to ${status}.`);
    } catch (statusError: any) {
      Alert.alert('Update failed', statusError?.message || 'Unable to update invoice status.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.stateText}>Loading invoice...</Text>
      </SafeAreaView>
    );
  }

  if (error || !invoice) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <Text style={styles.stateTitle}>Unable to load invoice</Text>
        <Text style={styles.stateText}>{error || 'Invoice not found.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadInvoice}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>


      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Details</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              router.push({
                pathname: '../Screens/InvoiceViewScreen',
                params: { invoiceId },
              })
            }
          >
            <Eye size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              router.push({
                pathname: '../Screens/CreateInvoiceScreen',
                params: { invoiceId },
              })
            }
          >
            <PenSquare size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={styles.topHeaderRow}>
            <Text style={styles.invoiceNumberLg}>{getInvoiceNumber(invoice)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}>
              <Text style={[styles.statusText, { color: statusTone.text }]}>{currentStatus.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.amountCard}>
            <View style={styles.amountBlock}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>{formatInvoiceCurrency(totalAmount)}</Text>
            </View>
            <View style={styles.amountDivider} />
            <View style={styles.amountBlock}>
              <Text style={styles.amountLabel}>Balance Due</Text>
              <Text style={[styles.amountValue, { color: '#2563eb' }]}>{formatInvoiceCurrency(balanceDueAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Status Actions</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
            {STATUS_ACTIONS.map(status => {
              const active = status === currentStatus;
              const busy = updatingStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusChip, active && styles.statusChipActive]}
                  onPress={() => handleStatusUpdate(status)}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={active ? '#fff' : '#2563eb'} />
                  ) : (
                    <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{status}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Customer</Text>
          </View>
          <View style={styles.partyBlock}>
            <View style={styles.customerHeader}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>{getCustomerName(invoice).charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.customerHeaderInfo}>
                <Text style={styles.customerName}>{getCustomerName(invoice)}</Text>
                <Text style={styles.customerPhone}>{invoice.customer?.mobilePhone?.trim() || 'No phone added'}</Text>
              </View>
            </View>

            <View style={styles.customerDivider} />

            <View style={styles.customerContactList}>
              <View style={styles.customerContactRow}>
                <Mail size={16} color="#64748b" />
                <Text style={styles.customerContactText}>{invoice.customer?.email?.trim() || invoice.customerEmailSnapshot?.trim() || 'No email added'}</Text>
              </View>
              <View style={styles.customerContactRow}>
                <MapPin size={16} color="#64748b" />
                <Text style={styles.customerContactText}>{formatAddress(invoice)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Issued On</Text>
              <Text style={styles.detailValue}>{formatDisplayDate(invoice.issuedOn)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Due On</Text>
              <Text style={styles.detailValue}>{formatDisplayDate(invoice.dueOn)}</Text>
            </View>
          </View>
          <View style={[styles.detailsGrid, { marginTop: 12 }]}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Net Terms</Text>
              <Text style={styles.detailValue}>{invoice.netTerms?.trim() || 'Not set'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>PO Number</Text>
              <Text style={styles.detailValue}>{invoice.purchaseOrderNumber?.trim() || 'Not set'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Line Items</Text>
          </View>
          <View style={styles.itemsContainer}>
            <View style={styles.itemsHeader}>
              <Text style={styles.itemsHeaderLabel}>Description</Text>
              <Text style={styles.itemsHeaderValue}>Amount</Text>
            </View>
            {invoice.lineItems?.length ? (
              invoice.lineItems.map((item, idx) => {
                const isLast = idx === invoice.lineItems!.length - 1;
                return (
                  <View key={item.id || `${item.name}-${item.sortOrder}`} style={[styles.lineItemRow, isLast && { borderBottomWidth: 0 }]}>
                    <View style={styles.lineItemLeft}>
                      <Text style={styles.lineItemName}>{item.name?.trim() || 'Untitled item'}</Text>
                      <Text style={styles.lineItemMeta}>
                        {item.quantity || 0} x {formatInvoiceCurrency(item.unitRate)}
                      </Text>
                      {item.description?.trim() ? <Text style={styles.lineItemDescription}>{item.description}</Text> : null}
                    </View>
                    <Text style={styles.lineItemTotal}>{formatInvoiceCurrency(item.lineTotal)}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.lineItemRow}>
                <Text style={styles.infoBody}>No line items found.</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Summary</Text>
          </View>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatInvoiceCurrency(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({invoice.taxRate || 0}%)</Text>
              <Text style={styles.totalValue}>{formatInvoiceCurrency(taxAmount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>{formatInvoiceCurrency(invoice.discountAmount)}</Text>
            </View>
            <View style={styles.totalRowHighlight}>
              <Text style={styles.totalLabelBold}>Total</Text>
              <Text style={styles.totalValueBold}>{formatInvoiceCurrency(totalAmount)}</Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabelBold}>Balance Due</Text>
              <Text style={styles.balanceValueBold}>{formatInvoiceCurrency(balanceDueAmount)}</Text>
            </View>
          </View>
        </View>

        {(invoice.notes?.trim() || invoice.jobId) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notes & Reference</Text>
            </View>
            <View style={styles.partyBlock}>
              {invoice.notes?.trim() ? (
                <View style={{ marginBottom: invoice.jobId ? 16 : 0 }}>
                  <Text style={styles.notesText}>{invoice.notes}</Text>
                </View>
              ) : null}

              {invoice.jobId ? (
                <TouchableOpacity
                  style={styles.linkedJobBtn}
                  onPress={() => router.push({ pathname: '../Screens/JobDetailScreen', params: { jobId: invoice.jobId } })}
                >
                  <View style={styles.linkedJobIcon}>
                    <Briefcase size={20} color="#2563eb" />
                  </View>
                  <View style={styles.linkedJobInfo}>
                    <Text style={styles.linkedJobTitle}>Linked Job</Text>
                    <Text style={styles.linkedJobId}>#{invoice.jobId}</Text>
                  </View>
                  <ChevronLeft size={20} color="#94a3b8" style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  topSection: { marginBottom: 24, gap: 16 },
  topHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceNumberLg: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  amountCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
  },
  amountBlock: { flex: 1 },
  amountDivider: { width: 1, backgroundColor: '#e2e8f0', marginHorizontal: 16 },
  amountLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6, textTransform: 'uppercase' },
  amountValue: { fontSize: 24, fontWeight: '800', color: '#0f172a' },

  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: { fontSize: 13, fontWeight: '700' },

  section: { marginBottom: 24 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },

  statusRow: { gap: 10, paddingRight: 20 },
  statusChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  statusChipText: { color: '#0f172a', fontWeight: '600', fontSize: 13 },
  statusChipTextActive: { color: '#fff' },

  partyBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customerHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  customerAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  customerAvatarText: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
  customerHeaderInfo: { flex: 1 },
  customerName: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  customerPhone: { fontSize: 14, color: '#64748b', marginTop: 2, fontWeight: '500' },
  customerDivider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },
  customerContactList: { gap: 12 },
  customerContactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customerContactText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 20, fontWeight: '500' },

  detailsGrid: { flexDirection: 'row', gap: 12 },
  detailItem: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

  itemsContainer: {
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  itemsHeaderLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  itemsHeaderValue: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  lineItemLeft: { flex: 1, marginRight: 12 },
  lineItemName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  lineItemMeta: { marginTop: 4, fontSize: 13, color: '#64748b', fontWeight: '500' },
  lineItemDescription: { marginTop: 6, fontSize: 13, color: '#94a3b8', lineHeight: 18 },
  lineItemTotal: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

  totalsContainer: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 14, color: '#475569', fontWeight: '500' },
  totalValue: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  totalRowHighlight: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  totalLabelBold: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  totalValueBold: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, backgroundColor: '#eff6ff', padding: 12, borderRadius: 8 },
  balanceLabelBold: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  balanceValueBold: { fontSize: 15, fontWeight: '700', color: '#2563eb' },

  notesText: { fontSize: 14, color: '#475569', lineHeight: 22, fontWeight: '500' },

  linkedJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  linkedJobIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  linkedJobInfo: { flex: 1 },
  linkedJobTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  linkedJobId: { fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 2 },

  stateContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  stateText: { marginTop: 8, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
});


export default InvoiceDetailScreen;
