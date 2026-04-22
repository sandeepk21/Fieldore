import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  ReceiptText,
  StickyNote,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CustomerEstimateSummaryResponse,
  CustomerInvoiceSummaryResponse,
  CustomerJobSummaryResponse,
  CustomerNoteResponse,
  CustomerResponse,
} from '@/src/api/generated';
import {
  formatCustomerAddress,
  getBillingCustomerAddress,
  getCustomerByIdApi,
  getCustomerDisplayName,
  getCustomerInitials,
  getPrimaryCustomerAddress,
} from '@/src/services/customerService';
import { formatInvoiceCurrency, formatInvoiceStatusLabel, getInvoiceStatusTone } from '@/src/services/invoiceService';

type TabType = 'Jobs' | 'Invoices' | 'Estimates' | 'Notes';

const AVATAR_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#4f46e5', '#ef4444', '#06b6d4'];

const getAvatarColor = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const openEditScreen = (customerId: string) => {
  if (!customerId) {
    return;
  }

  router.push({
    pathname: '../Screens/UpdateCustomerProfileScreen',
    params: { customerId },
  });
};

const openJobScreen = (jobId?: string) => {
  if (!jobId) {
    return;
  }

  router.push({
    pathname: '../Screens/JobDetailScreen',
    params: { jobId },
  });
};

const openInvoiceScreen = (invoiceId?: string) => {
  if (!invoiceId) {
    return;
  }

  router.push({
    pathname: '../Screens/InvoiceDetailScreen',
    params: { invoiceId },
  });
};

const formatDate = (value?: string | null, fallback = 'Not available') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDateTime = (value?: string | null, fallback = 'Not available') => {
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

const toHeadline = (value?: string | null, fallback = 'Not set') => {
  if (!value?.trim()) return fallback;
  return value
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const getJobStatusTone = (status?: string | null) => {
  const normalized = (status || '').trim().toLowerCase();

  if (normalized.includes('complete') || normalized === 'done') {
    return { bg: '#ecfdf5', text: '#059669', border: '#d1fae5' };
  }

  if (normalized.includes('cancel')) {
    return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
  }

  if (normalized.includes('progress') || normalized.includes('active')) {
    return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
  }

  return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
};

const getEstimateStatusTone = (status?: string | null) => {
  const normalized = (status || '').trim().toLowerCase();

  if (normalized.includes('approve') || normalized.includes('accept')) {
    return { bg: '#ecfdf5', text: '#059669', border: '#d1fae5' };
  }

  if (normalized.includes('reject') || normalized.includes('declin')) {
    return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
  }

  if (normalized.includes('sent') || normalized.includes('view')) {
    return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
  }

  return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
};

const EmptyTabCard = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={styles.emptyCard}>
    <Text style={styles.emptyCardTitle}>{title}</Text>
    <Text style={styles.emptyCardText}>{subtitle}</Text>
  </View>
);

const StatusBadge = ({
  label,
  tone,
}: {
  label: string;
  tone: { bg: string; text: string; border: string };
}) => (
  <View style={[styles.statusBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
    <Text style={[styles.statusBadgeText, { color: tone.text }]}>{label.toUpperCase()}</Text>
  </View>
);

const JobsTab = ({ jobs }: { jobs: CustomerJobSummaryResponse[] }) => {
  if (!jobs.length) {
    return (
      <EmptyTabCard
        title="No jobs yet"
        subtitle="Jobs linked to this customer will show up here as soon as they’re created."
      />
    );
  }

  return (
    <View style={styles.listGap}>
      {jobs.map(job => {
        const status = toHeadline(job.status, 'Scheduled');
        const schedule = job.scheduledStartAt
          ? `${formatDate(job.scheduledStartAt)}${job.scheduledEndAt ? ` - ${formatDate(job.scheduledEndAt)}` : ''}`
          : 'Schedule pending';

        return (
          <TouchableOpacity
            key={job.id || job.jobNumber || schedule}
            style={styles.recordCard}
            activeOpacity={0.9}
            onPress={() => openJobScreen(job.id)}
            disabled={!job.id}
          >
            <View style={styles.recordHeader}>
              <View style={styles.recordHeaderLeft}>
                <View style={styles.recordIconBox}>
                  <Briefcase size={20} color="#2563eb" />
                </View>
                <View style={styles.recordTextWrap}>
                  <Text style={styles.recordTitle}>{job.title?.trim() || job.jobNumber?.trim() || 'Untitled Job'}</Text>
                  <Text style={styles.recordSubtitle}>
                    {job.jobNumber?.trim() || 'Job number pending'}
                    {job.jobType?.trim() ? ` • ${toHeadline(job.jobType)}` : ''}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#cbd5e1" />
            </View>

            <View style={styles.recordMetaRow}>
              <View style={styles.inlineMeta}>
                <CalendarDays size={14} color="#94a3b8" />
                <Text style={styles.recordMetaText}>{schedule}</Text>
              </View>
              <StatusBadge label={status} tone={getJobStatusTone(job.status)} />
            </View>

            <View style={styles.recordFooter}>
              <Text style={styles.recordFooterText}>Priority: {toHeadline(job.priority, 'Normal')}</Text>
              <Text style={styles.recordFooterText}>Updated {formatDate(job.updatedAt || job.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const InvoicesTab = ({ invoices }: { invoices: CustomerInvoiceSummaryResponse[] }) => {
  if (!invoices.length) {
    return (
      <EmptyTabCard
        title="No invoices yet"
        subtitle="Invoices for this customer will appear here once they’re created."
      />
    );
  }

  return (
    <View style={styles.listGap}>
      {invoices.map(invoice => {
        const status = formatInvoiceStatusLabel(invoice.status);
        const total = formatInvoiceCurrency(invoice.totalAmount);
        const balance = formatInvoiceCurrency(invoice.balanceDueAmount ?? invoice.totalAmount);

        return (
          <TouchableOpacity
            key={invoice.id || invoice.invoiceNumber || status}
            style={styles.recordCard}
            activeOpacity={0.9}
            onPress={() => openInvoiceScreen(invoice.id)}
            disabled={!invoice.id}
          >
            <View style={styles.recordHeader}>
              <View style={styles.recordHeaderLeft}>
                <View style={styles.recordIconBox}>
                  <ReceiptText size={20} color="#2563eb" />
                </View>
                <View style={styles.recordTextWrap}>
                  <Text style={styles.recordTitle}>{invoice.invoiceNumber?.trim() || invoice.id || 'Invoice'}</Text>
                  <Text style={styles.recordSubtitle}>
                    Issued {formatDate(invoice.issuedOn)}
                    {invoice.dueOn ? ` • Due ${formatDate(invoice.dueOn)}` : ''}
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#cbd5e1" />
            </View>

            <View style={styles.recordMetaRow}>
              <View style={styles.amountBlock}>
                <Text style={styles.amountLabel}>Total</Text>
                <Text style={styles.amountValue}>{total}</Text>
              </View>
              <StatusBadge label={status} tone={getInvoiceStatusTone(invoice.status)} />
            </View>

            <View style={styles.recordFooter}>
              <Text style={styles.recordFooterText}>Balance due: {balance}</Text>
              <Text style={styles.recordFooterText}>
                {invoice.jobId ? `Linked job: ${invoice.jobId}` : 'Standalone invoice'}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const EstimatesTab = ({ estimates }: { estimates: CustomerEstimateSummaryResponse[] }) => {
  if (!estimates.length) {
    return (
      <EmptyTabCard
        title="No estimates yet"
        subtitle="Estimates linked to this customer will show here when they’re available."
      />
    );
  }

  return (
    <View style={styles.listGap}>
      {estimates.map(estimate => {
        const status = toHeadline(estimate.status, 'Draft');

        return (
          <View key={estimate.id || estimate.estimateNumber || status} style={styles.recordCard}>
            <View style={styles.recordHeader}>
              <View style={styles.recordHeaderLeft}>
                <View style={styles.recordIconBox}>
                  <FileText size={20} color="#2563eb" />
                </View>
                <View style={styles.recordTextWrap}>
                  <Text style={styles.recordTitle}>{estimate.estimateNumber?.trim() || estimate.id || 'Estimate'}</Text>
                  <Text style={styles.recordSubtitle}>
                    Issued {formatDate(estimate.issuedOn)}
                    {estimate.expiresOn ? ` • Expires ${formatDate(estimate.expiresOn)}` : ''}
                  </Text>
                </View>
              </View>
              <StatusBadge label={status} tone={getEstimateStatusTone(estimate.status)} />
            </View>

            <View style={styles.recordFooter}>
              <Text style={styles.recordFooterText}>Total: {formatInvoiceCurrency(estimate.totalAmount)}</Text>
              <Text style={styles.recordFooterText}>Updated {formatDate(estimate.updatedAt || estimate.createdAt)}</Text>
            </View>

            {!!estimate.notes?.trim() && <Text style={styles.recordNotes}>{estimate.notes.trim()}</Text>}
          </View>
        );
      })}
    </View>
  );
};

const NotesTab = ({
  notes,
  internalNotes,
  billingAddressText,
  customerId,
}: {
  notes: CustomerNoteResponse[];
  internalNotes: string;
  billingAddressText: string;
  customerId: string;
}) => {
  if (!notes.length && !internalNotes.trim()) {
    return (
      <EmptyTabCard
        title="No notes yet"
        subtitle="Customer notes and internal updates will show here once they’re added."
      />
    );
  }

  return (
    <View style={styles.listGap}>
      {!!internalNotes.trim() && (
        <View style={styles.noteCard}>
          <View style={styles.noteIconGhost}>
            <StickyNote size={40} color="#0f172a" opacity={0.05} />
          </View>
          <Text style={styles.noteLabel}>Internal note</Text>
          <Text style={styles.noteText}>{internalNotes}</Text>
          <View style={styles.noteFooter}>
            <Text style={styles.noteDate}>{billingAddressText}</Text>
            <TouchableOpacity onPress={() => openEditScreen(customerId)}>
              <Text style={styles.editBtn}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {notes.map(note => (
        <View key={note.id || `${note.createdAt}-${note.createdByUserId}`} style={styles.noteCard}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteAuthor}>{note.createdByDisplayName?.trim() || 'Team update'}</Text>
            <Text style={styles.noteTimestamp}>{formatDateTime(note.createdAt)}</Text>
          </View>
          <Text style={styles.noteText}>{note.body?.trim() || 'No note content available.'}</Text>
        </View>
      ))}
    </View>
  );
};

const SkeletonBlock = ({
  height,
  width,
  style,
}: {
  height: number;
  width: number | `${number}%`;
  style?: object;
}) => <View style={[styles.skeletonBlock, { height, width }, style]} />;

const CustomerProfileSkeleton = () => (
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
    <View style={styles.profileSection}>
      <View style={styles.skeletonAvatar} />
      <SkeletonBlock height={24} width="48%" style={{ marginBottom: 18 }} />
      <View style={styles.metaInfo}>
        <SkeletonBlock height={14} width="72%" />
        <SkeletonBlock height={14} width="80%" />
        <SkeletonBlock height={14} width="60%" />
      </View>
    </View>

    <View style={styles.actionGrid}>
      {[0, 1, 2].map(item => (
        <View key={item} style={styles.actionBtn}>
          <SkeletonBlock height={20} width={20} style={{ borderRadius: 10 }} />
          <SkeletonBlock height={10} width="42%" />
        </View>
      ))}
    </View>

    <View style={styles.tabBar}>
      {[0, 1, 2, 3].map(item => (
        <View key={item} style={styles.tabItem}>
          <SkeletonBlock height={12} width={58} />
        </View>
      ))}
    </View>

    <View style={styles.contentArea}>
      <View style={styles.emptyCard}>
        <SkeletonBlock height={18} width="36%" />
        <SkeletonBlock height={12} width="100%" style={{ marginTop: 12 }} />
        <SkeletonBlock height={12} width="88%" style={{ marginTop: 8 }} />
      </View>
    </View>
  </ScrollView>
);

const CustomerProfile: React.FC = () => {
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string }>();
  const customerId = typeof params.customerId === 'string' ? params.customerId : '';
  const [activeTab, setActiveTab] = useState<TabType>('Jobs');
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCustomer = useCallback(async () => {
    if (!customerId) {
      setError('Customer id is missing.');
      setCustomer(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await getCustomerByIdApi(customerId);
      setCustomer(response);
    } catch (loadError: any) {
      setCustomer(null);
      setError(loadError?.message || 'Failed to load customer profile.');
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      loadCustomer();
    }, [loadCustomer])
  );

  const primaryAddress = getPrimaryCustomerAddress(customer);
  const billingAddress = getBillingCustomerAddress(customer);
  const displayName = customer ? getCustomerDisplayName(customer) : params.customerName || 'Customer';
  const initials = getCustomerInitials(customer);
  const avatarColor = getAvatarColor(customer?.id || displayName);
  const email = customer?.email?.trim() || 'No email added';
  const serviceAddress = formatCustomerAddress(primaryAddress);
  const billingAddressText = customer?.billingSameAsService
    ? 'Same as service address'
    : formatCustomerAddress(billingAddress);
  const phoneNumber = customer?.mobilePhone?.trim() || customer?.alternatePhone?.trim() || '';
  const internalNotes = customer?.internalNotes?.trim() || '';
  const jobs = customer?.jobs || [];
  const invoices = customer?.invoices || [];
  const estimates = customer?.estimates || [];
  const notes = customer?.notes || [];
  const tabs: TabType[] = ['Jobs', 'Invoices', 'Estimates', 'Notes'];

  const handleCall = async () => {
    if (!phoneNumber) {
      return;
    }

    const url = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  const handleEmail = async () => {
    if (!customer?.email) {
      return;
    }

    const url = `mailto:${customer.email}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      

      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>PROFILE</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => openEditScreen(customerId)}>
          <MoreVertical size={22} color="#475569" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <CustomerProfileSkeleton />
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Unable to load profile</Text>
          <Text style={styles.stateError}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadCustomer}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
          <View style={styles.profileSection}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.customerName}>{displayName}</Text>

            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <Mail size={14} color="#cbd5e1" />
                <Text style={styles.metaText}>{email}</Text>
              </View>
              <View style={styles.metaItem}>
                <MapPin size={14} color="#cbd5e1" />
                <Text style={styles.metaText}>{serviceAddress}</Text>
              </View>
              <View style={styles.metaItem}>
                <Phone size={14} color="#cbd5e1" />
                <Text style={styles.metaText}>{phoneNumber || 'No phone number added'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionBtn, !phoneNumber && styles.actionBtnDisabled]} onPress={handleCall} disabled={!phoneNumber}>
              <Phone size={20} color="#2563eb" strokeWidth={2.5} />
              <Text style={styles.actionBtnText}>CALL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, !customer?.email && styles.actionBtnDisabled]}
              onPress={handleEmail}
              disabled={!customer?.email}
            >
              <Mail size={20} color="#2563eb" strokeWidth={2.5} />
              <Text style={styles.actionBtnText}>EMAIL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => openEditScreen(customerId)}>
              <Plus size={20} color="white" strokeWidth={3} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>EDIT</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            {tabs.map(tab => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                {activeTab === tab && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.contentArea}>
            {activeTab === 'Jobs' && (
              <JobsTab jobs={jobs} />
            )}

            {activeTab === 'Invoices' && (
              <InvoicesTab invoices={invoices} />
            )}

            {activeTab === 'Estimates' && (
              <EstimatesTab estimates={estimates} />
            )}

            {activeTab === 'Notes' && (
              <NotesTab
                notes={notes}
                internalNotes={internalNotes}
                billingAddressText={billingAddressText}
                customerId={customerId}
              />
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollPadding: { paddingBottom: 40 },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 2,
  },
  skeletonBlock: { backgroundColor: '#e2e8f0', borderRadius: 12 },
  skeletonAvatar: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  stateTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  stateText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  stateError: { fontSize: 13, fontWeight: '600', color: '#b91c1c', textAlign: 'center' },
  retryBtn: {
    marginTop: 4,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: 'white' },
  profileSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: 'white' },
  customerName: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  metaInfo: { marginTop: 16, gap: 8, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  metaText: { fontSize: 13, color: '#64748b', fontWeight: '500', textAlign: 'center' },
  actionGrid: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 80,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  actionBtnDisabled: { opacity: 0.55 },
  actionBtnText: { fontSize: 10, fontWeight: '900', color: '#2563eb', letterSpacing: 0.5 },
  actionBtnTextPrimary: { color: 'white' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 24,
  },
  tabItem: { paddingBottom: 16 },
  tabText: { fontSize: 14, fontWeight: '900', color: '#cbd5e1' },
  tabTextActive: { color: '#0f172a' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  contentArea: { padding: 24 },
  listGap: { gap: 16 },
  recordCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 18,
    gap: 14,
  },
  recordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  recordHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  recordIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordTextWrap: { flex: 1, gap: 4 },
  recordTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  recordSubtitle: { fontSize: 12, fontWeight: '600', color: '#64748b', lineHeight: 18 },
  recordMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  recordMetaText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  amountBlock: { gap: 2 },
  amountLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  amountValue: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  recordFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  recordFooterText: { flex: 1, fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  recordNotes: { fontSize: 13, fontWeight: '500', color: '#475569', lineHeight: 20 },
  emptyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 20,
  },
  emptyCardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptyCardText: { fontSize: 13, fontWeight: '500', color: '#64748b', marginTop: 8, lineHeight: 20 },
  noteCard: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  noteLabel: { fontSize: 11, fontWeight: '900', color: '#2563eb', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  noteAuthor: { flex: 1, fontSize: 13, fontWeight: '800', color: '#0f172a' },
  noteTimestamp: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  noteIconGhost: { position: 'absolute', top: 10, right: 10 },
  noteText: { fontSize: 14, fontWeight: '500', color: '#475569', lineHeight: 22 },
  noteFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  noteDate: { flex: 1, fontSize: 10, fontWeight: '900', color: '#cbd5e1' },
  editBtn: { fontSize: 10, fontWeight: '700', color: '#2563eb' },
});

export default CustomerProfile;
