import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import {
    Briefcase,
    ChevronLeft,
    FileText,
    Mail,
    MapPin,
    PenSquare,
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={[styles.statusBadge, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}>
            <Text style={[styles.statusText, { color: statusTone.text }]}>{currentStatus.toUpperCase()}</Text>
          </View>
          <Text style={styles.invoiceNumber}>{getInvoiceNumber(invoice)}</Text>
          <Text style={styles.totalAmount}>{formatInvoiceCurrency(totalAmount)}</Text>
          <Text style={styles.balanceLabel}>Balance due {formatInvoiceCurrency(balanceDueAmount)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Status Actions</Text>
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
          <Text style={styles.sectionLabel}>Customer</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                <FileText size={18} color="#2563eb" />
              </View>
              <View style={styles.infoHeaderCopy}>
                <Text style={styles.infoTitle}>{getCustomerName(invoice)}</Text>
                <Text style={styles.infoSubtext}>{invoice.customer?.mobilePhone?.trim() || 'No phone added'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Mail size={15} color="#94a3b8" />
              <Text style={styles.infoBody}>{invoice.customer?.email?.trim() || invoice.customerEmailSnapshot?.trim() || 'No email added'}</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={15} color="#94a3b8" />
              <Text style={styles.infoBody}>{formatAddress(invoice)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Invoice Details</Text>
          <View style={styles.infoCard}>
            <DetailRow label="Issued On" value={formatDisplayDate(invoice.issuedOn)} />
            <DetailRow label="Due On" value={formatDisplayDate(invoice.dueOn)} />
            <DetailRow label="Net Terms" value={invoice.netTerms?.trim() || 'Not set'} />
            <DetailRow label="PO Number" value={invoice.purchaseOrderNumber?.trim() || 'Not set'} />
            <DetailRow label="Job Id" value={invoice.jobId || 'No linked job'} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Line Items</Text>
          <View style={styles.infoCard}>
            {invoice.lineItems?.length ? (
              invoice.lineItems.map(item => (
                <View key={item.id || `${item.name}-${item.sortOrder}`} style={styles.lineItemRow}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemName}>{item.name?.trim() || 'Untitled item'}</Text>
                    <Text style={styles.lineItemMeta}>
                      {item.quantity || 0} x {formatInvoiceCurrency(item.unitRate)}
                    </Text>
                    {item.description?.trim() ? <Text style={styles.lineItemDescription}>{item.description}</Text> : null}
                  </View>
                  <Text style={styles.lineItemTotal}>{formatInvoiceCurrency(item.lineTotal)}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.infoBody}>No line items found.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Totals</Text>
          <View style={styles.infoCard}>
            <DetailRow label="Subtotal" value={formatInvoiceCurrency(subtotal)} />
            <DetailRow label={`Tax (${invoice.taxRate || 0}%)`} value={formatInvoiceCurrency(taxAmount)} />
            <DetailRow label="Discount" value={formatInvoiceCurrency(invoice.discountAmount)} />
            <View style={styles.divider} />
            <DetailRow label="Total" value={formatInvoiceCurrency(totalAmount)} strong />
            <DetailRow label="Balance Due" value={formatInvoiceCurrency(balanceDueAmount)} strong />
          </View>
        </View>

        {(invoice.notes?.trim() || invoice.jobId) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes & Reference</Text>
            <View style={styles.infoCard}>
              {invoice.jobId ? (
                <View style={styles.infoRow}>
                  <Briefcase size={15} color="#94a3b8" />
                  <Text style={styles.infoBody}>Linked job: {invoice.jobId}</Text>
                </View>
              ) : null}
              {invoice.notes?.trim() ? <Text style={styles.notesText}>{invoice.notes}</Text> : null}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const DetailRow = ({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) => (
  <View style={styles.detailRow}>
    <Text style={[styles.detailLabel, strong && styles.detailLabelStrong]}>{label}</Text>
    <Text style={[styles.detailValue, strong && styles.detailValueStrong]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  invoiceNumber: { marginTop: 14, fontSize: 14, fontWeight: '800', color: '#64748b' },
  totalAmount: { marginTop: 8, fontSize: 34, fontWeight: '900', color: '#0f172a' },
  balanceLabel: { marginTop: 8, fontSize: 14, fontWeight: '700', color: '#475569' },
  section: { marginTop: 18 },
  sectionLabel: { fontSize: 14, fontWeight: '900', color: '#334155', marginBottom: 10, textTransform: 'uppercase' },
  statusRow: { gap: 10, paddingRight: 20 },
  statusChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  statusChipText: { color: '#2563eb', fontWeight: '800', fontSize: 13 },
  statusChipTextActive: { color: '#fff' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoHeaderCopy: { flex: 1 },
  infoTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  infoSubtext: { marginTop: 4, fontSize: 13, color: '#64748b', fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 },
  infoBody: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 21, fontWeight: '600' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 12 },
  detailLabel: { flex: 1, fontSize: 14, color: '#64748b', fontWeight: '600' },
  detailLabelStrong: { color: '#0f172a', fontWeight: '800' },
  detailValue: { flex: 1, fontSize: 14, color: '#0f172a', textAlign: 'right', fontWeight: '700' },
  detailValueStrong: { fontSize: 16, fontWeight: '900' },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  lineItemLeft: { flex: 1 },
  lineItemName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  lineItemMeta: { marginTop: 4, fontSize: 13, color: '#64748b', fontWeight: '600' },
  lineItemDescription: { marginTop: 6, fontSize: 13, color: '#475569', lineHeight: 20 },
  lineItemTotal: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 6 },
  notesText: { marginTop: 10, fontSize: 14, color: '#475569', lineHeight: 22, fontWeight: '600' },
  stateContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  stateText: { marginTop: 10, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryButtonText: { color: '#fff', fontWeight: '800' },
});

export default InvoiceDetailScreen;
