import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Link2,
  Mail,
  Paperclip,
  Phone,
  Send,
  Trash2,
  User,
  XCircle,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstimateResponse } from '@/src/api/generated';
import { useLoader } from '@/src/context/LoaderContext';
import {
  buildAttachmentUrl,
  buildPublicQuoteUrl,
  deleteEstimateApi,
  formatEstimateCurrency,
  formatEstimateStatusLabel,
  getEstimateByIdApi,
  getEstimateStatusTone,
  sendEstimateApi,
  updateEstimateStatusApi,
} from '@/src/services/estimateService';

// Backend sends DateOnly ("YYYY-MM-DD") for issue/expiry — build a *local* date so
// formatting never rolls over to the previous day in negative UTC offsets.
const parseDateOnly = (value?: string | null): Date | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDay = (value?: string | null, fallback = '—') => {
  const date = parseDateOnly(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date);
};

const formatDateTime = (value?: string | null, fallback = '—') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const EstimateDetailScreen: React.FC = () => {
  const params = useLocalSearchParams<{ estimateId?: string }>();
  const estimateId = typeof params.estimateId === 'string' ? params.estimateId : '';

  const { showLoader, hideLoader } = useLoader();
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const loadEstimate = useCallback(async () => {
    if (!estimateId) {
      setError('Estimate id is missing.');
      setEstimate(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await getEstimateByIdApi(estimateId);
      setEstimate(response);
    } catch (loadError: any) {
      setEstimate(null);
      setError(loadError?.message || 'Failed to load estimate.');
    } finally {
      setIsLoading(false);
    }
  }, [estimateId]);

  useFocusEffect(
    useCallback(() => {
      loadEstimate();
    }, [loadEstimate])
  );

  const status = (estimate?.status || '').trim().toLowerCase();
  const tone = getEstimateStatusTone(estimate?.status);
  const isDraft = status === 'draft';
  const isSent = status === 'sent';
  const isApproved = status === 'approved';
  const isConverted = status === 'converted';
  const canConvert = isApproved;
  const canRespond = isSent; // provider can record a verbal accept/reject
  const customerName = estimate?.customer?.displayName?.trim() || estimate?.customerNameSnapshot?.trim() || 'Customer';
  const customerEmail = estimate?.customer?.email?.trim() || estimate?.customerEmailSnapshot?.trim() || '';
  const customerPhone = estimate?.customer?.mobilePhone?.trim() || '';

  // Share the public, client-facing quote link. Re-issues a token via the send endpoint.
  const handleSend = useCallback(async () => {
    if (!estimate?.id) return;
    setWorking(true);
    showLoader();
    try {
      const sent = await sendEstimateApi(estimate.id);
      const url = buildPublicQuoteUrl(sent.publicToken);
      setEstimate(sent);
      hideLoader();
      setWorking(false);
      if (url) {
        try {
          await Share.share({ message: `Hi ${customerName}, here's your quote from us: ${url}` });
        } catch {
          // user dismissed the share sheet — not an error
        }
      }
      Alert.alert('Quote sent', 'This quote is marked as sent. Share the link with your customer any time.');
    } catch (sendError: any) {
      hideLoader();
      setWorking(false);
      Alert.alert('Could not send', sendError?.message || 'Something went wrong sending the quote.');
    }
  }, [estimate?.id, customerName, showLoader, hideLoader]);

  const handleCopyLink = useCallback(async () => {
    const url = buildPublicQuoteUrl(estimate?.publicToken);
    if (!url) {
      Alert.alert('No link yet', 'Send the quote first to generate a shareable link.');
      return;
    }
    try {
      await Share.share({ message: `Hi ${customerName}, here's your quote: ${url}` });
    } catch {
      // dismissed — ignore
    }
  }, [estimate?.publicToken, customerName]);

  const applyStatus = useCallback(
    async (next: 'approved' | 'rejected', label: string) => {
      if (!estimate?.id) return;
      setWorking(true);
      showLoader();
      try {
        const updated = await updateEstimateStatusApi(estimate.id, { status: next });
        setEstimate(updated);
        hideLoader();
        setWorking(false);
        Alert.alert('Status updated', `This quote is now marked as ${label}.`);
      } catch (statusError: any) {
        hideLoader();
        setWorking(false);
        Alert.alert('Could not update', statusError?.message || 'Something went wrong updating the status.');
      }
    },
    [estimate?.id, showLoader, hideLoader]
  );

  const confirmStatus = useCallback(
    (next: 'approved' | 'rejected', label: string) => {
      Alert.alert(
        `Mark ${label}?`,
        `Record that the customer ${next === 'approved' ? 'accepted' : 'declined'} this quote.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: `Mark ${label}`, onPress: () => applyStatus(next, label) },
        ]
      );
    },
    [applyStatus]
  );

  const handleConvert = useCallback(() => {
    if (!estimate?.id) return;
    router.push({
      pathname: '../Screens/CreateJobScreen',
      params: {
        prefillCustomerId: estimate.customerId || '',
        prefillTitle: estimate.title?.trim() || `Job from ${estimate.estimateNumber || 'Estimate'}`,
        fromEstimateId: estimate.id,
      },
    });
  }, [estimate?.id, estimate?.customerId, estimate?.title, estimate?.estimateNumber]);

  const handleViewJob = useCallback(() => {
    if (!estimate?.convertedJobId) return;
    router.push({ pathname: '../Screens/JobDetailScreen', params: { jobId: estimate.convertedJobId } });
  }, [estimate?.convertedJobId]);

  const handleDelete = useCallback(() => {
    if (!estimate?.id) return;
    const id = estimate.id;
    Alert.alert('Delete estimate?', 'This permanently removes the quote. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setWorking(true);
          showLoader();
          try {
            await deleteEstimateApi(id);
            hideLoader();
            setWorking(false);
            router.back();
          } catch (deleteError: any) {
            hideLoader();
            setWorking(false);
            Alert.alert('Could not delete', deleteError?.message || 'Something went wrong deleting the quote.');
          }
        },
      },
    ]);
  }, [estimate?.id, showLoader, hideLoader]);

  const openAttachment = useCallback(async (storagePath?: string | null) => {
    const url = buildAttachmentUrl(storagePath);
    if (!url) return;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  }, []);

  const lineItems = estimate?.lineItems || [];
  const attachments = estimate?.attachments || [];
  const discountAmount = estimate?.discountAmount || 0;
  const depositAmount = estimate?.depositAmount || 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>ESTIMATE</Text>
        <View style={styles.iconBtn} />
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>Loading estimate…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Unable to load estimate</Text>
          <Text style={styles.stateError}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadEstimate}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : estimate ? (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            {/* Header card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <FileText size={22} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroNumber}>{estimate.estimateNumber || 'Estimate'}</Text>
                  {!!estimate.title?.trim() && <Text style={styles.heroTitle}>{estimate.title.trim()}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                  <Text style={[styles.statusBadgeText, { color: tone.text }]}>
                    {formatEstimateStatusLabel(estimate.status).toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroTotal}>{formatEstimateCurrency(estimate.totalAmount)}</Text>

              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaItem}>
                  <Calendar size={13} color="#94a3b8" />
                  <Text style={styles.heroMetaText}>Issued {formatDay(estimate.issuedOn)}</Text>
                </View>
                {!!estimate.expiresOn && (
                  <View style={styles.heroMetaItem}>
                    <Calendar size={13} color="#94a3b8" />
                    <Text style={styles.heroMetaText}>Valid until {formatDay(estimate.expiresOn)}</Text>
                  </View>
                )}
              </View>

              {(isSent || estimate.sentAt) && (
                <Text style={styles.heroSubtle}>
                  {estimate.sentAt ? `Sent ${formatDateTime(estimate.sentAt)}` : 'Sent'}
                  {estimate.respondedAt ? ` • Responded ${formatDateTime(estimate.respondedAt)}` : ''}
                </Text>
              )}
            </View>

            {/* Customer */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CUSTOMER</Text>
              <View style={styles.customerCard}>
                <View style={styles.customerAvatar}>
                  <User size={18} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{customerName}</Text>
                  {!!customerEmail && (
                    <View style={styles.inlineMeta}>
                      <Mail size={12} color="#94a3b8" />
                      <Text style={styles.inlineMetaText}>{customerEmail}</Text>
                    </View>
                  )}
                  {!!customerPhone && (
                    <View style={styles.inlineMeta}>
                      <Phone size={12} color="#94a3b8" />
                      <Text style={styles.inlineMetaText}>{customerPhone}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Line items */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>LINE ITEMS</Text>
              <View style={styles.itemsCard}>
                {lineItems.length === 0 ? (
                  <Text style={styles.emptyText}>No line items on this estimate.</Text>
                ) : (
                  lineItems.map((item, index) => (
                    <View
                      key={item.id || `${item.serviceName}-${index}`}
                      style={[styles.itemRow, index < lineItems.length - 1 && styles.itemRowDivider]}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.itemName}>{item.serviceName || 'Service'}</Text>
                        {!!item.description?.trim() && (
                          <Text style={styles.itemDesc}>{item.description.trim()}</Text>
                        )}
                        <Text style={styles.itemQty}>
                          {item.quantity} × {formatEstimateCurrency(item.unitPrice)}
                        </Text>
                      </View>
                      <Text style={styles.itemTotal}>{formatEstimateCurrency(item.lineTotal)}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Totals */}
            <View style={styles.section}>
              <View style={styles.totalsCard}>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Subtotal</Text>
                  <Text style={styles.totalsValue}>{formatEstimateCurrency(estimate.subtotalAmount)}</Text>
                </View>
                {discountAmount > 0 && (
                  <View style={styles.totalsRow}>
                    <Text style={[styles.totalsLabel, { color: '#d97706' }]}>Discount</Text>
                    <Text style={[styles.totalsValue, { color: '#d97706' }]}>
                      -{formatEstimateCurrency(discountAmount)}
                    </Text>
                  </View>
                )}
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Tax ({estimate.taxRate || 0}%)</Text>
                  <Text style={styles.totalsValue}>+{formatEstimateCurrency(estimate.taxAmount)}</Text>
                </View>
                <View style={styles.totalsDivider} />
                <View style={styles.totalsRow}>
                  <Text style={styles.grandLabel}>Total</Text>
                  <Text style={styles.grandValue}>{formatEstimateCurrency(estimate.totalAmount)}</Text>
                </View>
                {depositAmount > 0 && (
                  <View style={[styles.totalsRow, { marginTop: 6 }]}>
                    <Text style={[styles.totalsLabel, { color: '#2563eb' }]}>Deposit due</Text>
                    <Text style={[styles.totalsValue, { color: '#2563eb' }]}>
                      {formatEstimateCurrency(depositAmount)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Notes */}
            {!!estimate.notes?.trim() && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>MESSAGE TO CUSTOMER</Text>
                <View style={styles.notesCard}>
                  <Text style={styles.notesText}>{estimate.notes.trim()}</Text>
                </View>
              </View>
            )}
            {!!estimate.internalNotes?.trim() && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>INTERNAL NOTES (PRIVATE)</Text>
                <View style={[styles.notesCard, styles.internalNotesCard]}>
                  <Text style={styles.notesText}>{estimate.internalNotes.trim()}</Text>
                </View>
              </View>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ATTACHMENTS</Text>
                {attachments.map((file, index) => (
                  <TouchableOpacity
                    key={file.id || `${file.fileName}-${index}`}
                    style={styles.attachmentRow}
                    onPress={() => openAttachment(file.storagePath)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.attachmentIcon}>
                      <Paperclip size={16} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attachmentName} numberOfLines={1}>{file.fileName}</Text>
                      {!!formatBytes(file.fileSizeBytes) && (
                        <Text style={styles.attachmentMeta}>{formatBytes(file.fileSizeBytes)}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Action bar */}
          <View style={styles.footer}>
            <View style={styles.footerRowTop}>
              {isConverted ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleViewJob} disabled={working}>
                  <Briefcase size={18} color="white" />
                  <Text style={styles.primaryBtnText}>View Job</Text>
                </TouchableOpacity>
              ) : canConvert ? (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleConvert} disabled={working}>
                  <Briefcase size={18} color="white" />
                  <Text style={styles.primaryBtnText}>Convert to Job</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSend} disabled={working}>
                  <Send size={18} color="white" />
                  <Text style={styles.primaryBtnText}>{isDraft ? 'Send to Customer' : 'Resend Quote'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.footerRowBottom}>
              {(isSent || isApproved || isConverted) && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleCopyLink} disabled={working}>
                  <Link2 size={16} color="#2563eb" />
                  <Text style={styles.secondaryBtnText}>Share link</Text>
                </TouchableOpacity>
              )}
              {canRespond && (
                <>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => confirmStatus('approved', 'Approved')}
                    disabled={working}
                  >
                    <CheckCircle2 size={16} color="#059669" />
                    <Text style={[styles.secondaryBtnText, { color: '#059669' }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => confirmStatus('rejected', 'Rejected')}
                    disabled={working}
                  >
                    <XCircle size={16} color="#dc2626" />
                    <Text style={[styles.secondaryBtnText, { color: '#dc2626' }]}>Reject</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleDelete} disabled={working}>
                <Trash2 size={16} color="#dc2626" />
                <Text style={[styles.secondaryBtnText, { color: '#dc2626' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: 'white',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', letterSpacing: 2 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 10 },
  stateTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  stateText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  stateError: { fontSize: 13, fontWeight: '600', color: '#b91c1c', textAlign: 'center' },
  retryBtn: { marginTop: 4, backgroundColor: '#2563eb', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: 'white' },
  scrollPadding: { padding: 20, paddingBottom: 220 },
  heroCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 20,
    marginBottom: 24,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNumber: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  heroTitle: { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 2 },
  heroTotal: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1, marginTop: 16 },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  heroSubtle: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#cbd5e1', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  inlineMetaText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  itemsCard: { backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', padding: 18 },
  emptyText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 12 },
  itemRowDivider: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  itemDesc: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 3, lineHeight: 18 },
  itemQty: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginTop: 6 },
  itemTotal: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  totalsCard: { backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', padding: 18 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  totalsLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  totalsValue: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  totalsDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  grandLabel: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  grandValue: { fontSize: 20, fontWeight: '900', color: '#2563eb' },
  notesCard: { backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', padding: 18 },
  internalNotesCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  notesText: { fontSize: 14, fontWeight: '500', color: '#475569', lineHeight: 22 },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  attachmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  attachmentMeta: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 12,
  },
  footerRowTop: { flexDirection: 'row' },
  footerRowBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryBtn: {
    flex: 1,
    height: 56,
    backgroundColor: '#2563eb',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '900', color: 'white' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '800', color: '#2563eb' },
});

export default EstimateDetailScreen;
