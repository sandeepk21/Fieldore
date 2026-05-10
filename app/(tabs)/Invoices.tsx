import { router } from 'expo-router';
import {
  Bell,
  FileText,
  Mail,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { InvoiceResponse } from '@/src/api/generated';
import SideFilterSheet from '@/src/components/SideFilterSheet';
import {
  formatInvoiceCurrency,
  formatInvoiceStatusLabel,
  getInvoiceStatusTone,
  getInvoicesApi,
} from '@/src/services/invoiceService';

const STATUS_OPTIONS = ['All', 'Draft', 'Sent', 'Viewed', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'] as const;
const DATE_PRESET_OPTIONS = ['This Week', 'This Month', '3 Months', 'Issued Dates'] as const;

type InvoiceStatusOption = (typeof STATUS_OPTIONS)[number];
type DatePresetOption = (typeof DATE_PRESET_OPTIONS)[number] | null;

type InvoiceFilterState = {
  status: InvoiceStatusOption;
  issuedFrom: string;
  issuedTo: string;
};

type DateFieldKey = keyof Pick<InvoiceFilterState, 'issuedFrom' | 'issuedTo'>;

const createInitialFilters = (): InvoiceFilterState => ({
  status: 'All',
  issuedFrom: '',
  issuedTo: '',
});

const formatDisplayDate = (value?: string | null) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const capitalizeWords = (str: string) => {
  if (!str) return str;
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

const getInvoiceTitle = (invoice: InvoiceResponse) => {
  const title = invoice.customer?.displayName?.trim() ||
    invoice.customerNameSnapshot?.trim() ||
    'Unnamed customer';
  return capitalizeWords(title);
};

const getInvoiceNumber = (invoice: InvoiceResponse) =>
  invoice.invoiceNumber?.trim() || invoice.id || 'Invoice';

const formatFilterDateLabel = (value: string) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfWeek = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getDatePresetRange = (preset: Exclude<DatePresetOption, null>) => {
  const today = new Date();
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);

  if (preset === 'This Week') {
    return {
      issuedFrom: toDateKey(getStartOfWeek(today)),
      issuedTo: toDateKey(end),
    };
  }

  if (preset === 'This Month') {
    return {
      issuedFrom: toDateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
      issuedTo: toDateKey(end),
    };
  }

  if (preset === '3 Months') {
    return {
      issuedFrom: toDateKey(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      issuedTo: toDateKey(end),
    };
  }

  return {
    issuedFrom: '',
    issuedTo: '',
  };
};

const SkeletonCard = () => {
  const animValue = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0.4, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [animValue]);

  return (
    <Animated.View style={[styles.invoiceCard, { opacity: animValue }]}>
      <View style={styles.invoiceHeader}>
        <View style={[styles.skeletonBlock, { width: 48, height: 48, borderRadius: 14 }]} />
        <View style={[styles.invoiceInfo, { gap: 6 }]}>
          <View style={[styles.skeletonBlock, { width: '60%', height: 16, borderRadius: 4 }]} />
          <View style={[styles.skeletonBlock, { width: '40%', height: 12, borderRadius: 4 }]} />
        </View>
        <View style={[styles.skeletonBlock, { width: 60, height: 24, borderRadius: 6 }]} />
      </View>
      <View style={styles.invoiceFooter}>
        <View style={[styles.skeletonBlock, { width: 80, height: 20, borderRadius: 4 }]} />
        <View style={[styles.skeletonBlock, { width: 100, height: 20, borderRadius: 4 }]} />
      </View>
    </Animated.View>
  );
};

const InvoiceListItem = ({ invoice, onPress }: { invoice: InvoiceResponse; onPress: (id?: string) => void }) => {
  const tone = getInvoiceStatusTone(invoice.status);
  const title = getInvoiceTitle(invoice);
  const number = getInvoiceNumber(invoice);

  const now = new Date();
  let isOverdue = false;
  if (invoice.status?.toLowerCase() !== 'paid' && invoice.status?.toLowerCase() !== 'cancelled' && invoice.dueOn) {
    if (new Date(invoice.dueOn) < now) isOverdue = true;
  }

  const renderRightActions = () => (
    <View style={styles.swipeActionsContainer}>
      <TouchableOpacity style={[styles.swipeAction, { backgroundColor: '#2563eb' }]}>
        <Mail size={20} color="#fff" />
        <Text style={styles.swipeActionText}>Send</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.swipeAction, { backgroundColor: '#ef4444' }]}>
        <Trash2 size={20} color="#fff" />
        <Text style={styles.swipeActionText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false} containerStyle={styles.swipeableContainer}>
      <TouchableOpacity style={styles.invoiceCard} onPress={() => onPress(invoice.id)} activeOpacity={0.7}>
        <View style={styles.invoiceCardTop}>
          <View style={styles.invoiceIconWrap}>
            <FileText size={22} color="#2563eb" />
          </View>
          <View style={styles.invoiceInfoLeft}>
             <Text style={styles.customerName} numberOfLines={1}>{title}</Text>
             <View style={styles.metaRow}>
               <Text style={styles.invoiceNumber}>{number}</Text>
               {invoice.jobId && (
                 <>
                   <View style={styles.metaDot} />
                   <Text style={styles.jobRef}>Linked Job</Text>
                 </>
               )}
             </View>
          </View>
          <View style={styles.invoiceInfoRight}>
             <Text style={styles.footerAmount}>{formatInvoiceCurrency(invoice.totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.invoiceCardBottom}>
          <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: tone.text }]} />
            <Text style={[styles.statusText, { color: tone.text }]}>
              {formatInvoiceStatusLabel(invoice.status)}
            </Text>
          </View>

          <View style={styles.dueDateRow}>
            <Text style={styles.footerLabel}>Due </Text>
            <Text style={[styles.footerDate, isOverdue && styles.overdueText]}>
              {formatDisplayDate(invoice.dueOn)}
            </Text>
            {isOverdue && <View style={styles.overdueIndicator} />}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const InvoicesScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<InvoiceFilterState>(createInitialFilters());
  const [showFilters, setShowFilters] = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateFieldKey | null>(null);
  const [selectedIssuedPreset, setSelectedIssuedPreset] = useState<DatePresetOption>(null);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadInvoices = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);

      setError('');

      try {
        const response = await getInvoicesApi({
          PageNumber: 1,
          PageSize: 100,
          Search: searchQuery.trim() || undefined,
          Status: filters.status === 'All' ? undefined : filters.status,
          IssuedFrom: filters.issuedFrom || undefined,
          IssuedTo: filters.issuedTo || undefined,
        });
        setInvoices(response.data);
      } catch (loadError: any) {
        setInvoices([]);
        setError(loadError?.message || 'Failed to load invoices.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [filters, searchQuery]
  );

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const activeFilterCount = useMemo(
    () => [Boolean(filters.issuedFrom), Boolean(filters.issuedTo)].filter(Boolean).length,
    [filters]
  );

  const stats = useMemo(() => {
    let totalUnpaid = 0;
    let paidThisMonth = 0;
    let overdueAmount = 0;
    let pendingCount = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    invoices.forEach(inv => {
      const amt = inv.totalAmount || 0;
      const status = (inv.status || '').toLowerCase();

      if (status !== 'paid' && status !== 'cancelled') {
        totalUnpaid += amt;
      }

      if (status === 'paid') {
        const issued = inv.issuedOn ? new Date(inv.issuedOn) : null;
        if (issued && issued.getMonth() === currentMonth && issued.getFullYear() === currentYear) {
          paidThisMonth += amt;
        }
      }

      if (status === 'overdue') {
        overdueAmount += amt;
      } else if (status !== 'paid' && status !== 'cancelled' && inv.dueOn) {
        const due = new Date(inv.dueOn);
        if (due < now) {
          overdueAmount += amt;
        }
      }

      if (['draft', 'sent', 'viewed', 'partially paid'].includes(status)) {
        pendingCount++;
      }
    });

    return { totalUnpaid, paidThisMonth, overdueAmount, pendingCount };
  }, [invoices]);

  const markedDates = useMemo(() => {
    if (!activeDateField || !filters[activeDateField]) return {};
    return {
      [filters[activeDateField]]: {
        selected: true,
        selectedColor: '#2563eb',
        selectedTextColor: '#ffffff',
      },
    };
  }, [activeDateField, filters]);

  const updateFilter = <K extends keyof InvoiceFilterState>(key: K, value: InvoiceFilterState[K]) => {
    setFilters(current => ({ ...current, [key]: value }));
  };

  const clearDateFilters = () => {
    setFilters(current => ({ ...current, issuedFrom: '', issuedTo: '' }));
    setSelectedIssuedPreset(null);
    setActiveDateField(null);
  };

  const applyDatePreset = (preset: Exclude<DatePresetOption, null>) => {
    if (preset === 'Issued Dates') {
      setSelectedIssuedPreset(preset);
      setActiveDateField('issuedFrom');
      return;
    }

    const range = getDatePresetRange(preset);
    setFilters(current => ({ ...current, issuedFrom: range.issuedFrom, issuedTo: range.issuedTo }));
    setSelectedIssuedPreset(preset);
    setActiveDateField(null);
  };

  const handleDatePick = (field: DateFieldKey, value: string) => {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
    setSelectedIssuedPreset(nextFilters.issuedFrom || nextFilters.issuedTo ? 'Issued Dates' : null);
  };

  const openInvoice = (invoiceId?: string) => {
    if (!invoiceId) return;
    router.push({
      pathname: '../Screens/InvoiceDetailScreen',
      params: { invoiceId },
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.pageTitle}>Invoices</Text>
            <Text style={styles.businessSummary}>Fieldore Services LLC</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton}>
              <Bell size={20} color="#64748b" />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>F</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadInvoices(true)} tintColor="#2563eb" />}
        >
          {/* Index 0: Analytics Section */}
          <View style={styles.analyticsSection}>
            <LinearGradient 
              colors={['#0f172a', '#1e293b']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }} 
              style={styles.heroAnalyticCard}
            >
              <View style={styles.heroTop}>
                <Text style={styles.heroAnalyticLabel}>Total Unpaid</Text>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{stats.pendingCount} Pending</Text>
                </View>
              </View>
              <Text style={styles.heroAnalyticValue}>{formatInvoiceCurrency(stats.totalUnpaid)}</Text>
            </LinearGradient>

            <View style={styles.analyticsGrid}>
              <View style={styles.analyticCard}>
                <Text style={styles.analyticLabel}>Overdue</Text>
                <Text style={[styles.analyticValue, stats.overdueAmount > 0 && { color: '#ef4444' }]}>
                  {formatInvoiceCurrency(stats.overdueAmount)}
                </Text>
              </View>
              <View style={styles.analyticCard}>
                <Text style={styles.analyticLabel}>Paid This Month</Text>
                <Text style={styles.analyticValue}>{formatInvoiceCurrency(stats.paidThisMonth)}</Text>
              </View>
            </View>
          </View>

          {/* Index 1: Sticky Search & Filters */}
          <View style={styles.stickyHeaderContainer}>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search invoices, customers..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity
                style={[styles.filterButton, showFilters && styles.filterButtonActive]}
                onPress={() => setShowFilters(true)}
                activeOpacity={0.7}
              >
                <SlidersHorizontal size={18} color={showFilters ? '#ffffff' : '#64748b'} />
                {activeFilterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusRow}
              style={styles.statusScroller}
            >
              {STATUS_OPTIONS.map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusChip, filters.status === status && styles.statusChipActive]}
                  onPress={() => updateFilter('status', status)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusChipText, filters.status === status && styles.statusChipTextActive]}>
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Index 2: List Content */}
          <View style={styles.listContent}>
            {isLoading && invoices.length === 0 ? (
              <View style={styles.skeletonContainer}>
                {[1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} />)}
              </View>
            ) : error ? (
              <View style={styles.stateContainer}>
                <Text style={styles.stateTitle}>Unable to load invoices</Text>
                <Text style={styles.stateText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadInvoices()}>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : invoices.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <FileText size={40} color="#2563eb" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>No invoices found</Text>
                <Text style={styles.emptyText}>
                  {searchQuery.trim() || activeFilterCount > 0 || filters.status !== 'All'
                    ? 'Try a different search or adjust the filters to find what you are looking for.'
                    : 'Create your first invoice to start getting paid.'}
                </Text>
              </View>
            ) : (
              invoices.map(invoice => (
                <InvoiceListItem key={invoice.id || invoice.invoiceNumber} invoice={invoice} onPress={openInvoice} />
              ))
            )}
          </View>
        </ScrollView>

        <SideFilterSheet
          visible={showFilters}
          title="Date Filters"
          subtitle="Filter invoices by their issued date."
          badgeCount={activeFilterCount}
          onClose={() => setShowFilters(false)}
          onClear={activeFilterCount > 0 ? clearDateFilters : undefined}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Quick Presets</Text>
              <View style={styles.presetGrid}>
                {DATE_PRESET_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.presetChip, selectedIssuedPreset === option && styles.presetChipActive]}
                    onPress={() => applyDatePreset(option)}
                  >
                    <Text style={[styles.presetChipText, selectedIssuedPreset === option && styles.presetChipTextActive]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Custom Range</Text>
              <View style={styles.dateColumn}>
                <TouchableOpacity
                  style={[styles.dateCard, activeDateField === 'issuedFrom' && styles.dateCardActive]}
                  onPress={() => setActiveDateField(current => (current === 'issuedFrom' ? null : 'issuedFrom'))}
                >
                  <Text style={styles.dateCardLabel}>Issued From</Text>
                  <Text style={styles.dateCardValue}>{formatFilterDateLabel(filters.issuedFrom)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateCard, activeDateField === 'issuedTo' && styles.dateCardActive]}
                  onPress={() => setActiveDateField(current => (current === 'issuedTo' ? null : 'issuedTo'))}
                >
                  <Text style={styles.dateCardLabel}>Issued To</Text>
                  <Text style={styles.dateCardValue}>{formatFilterDateLabel(filters.issuedTo)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {activeDateField && (
              <View style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                  <View>
                    <Text style={styles.calendarTitle}>
                      {activeDateField === 'issuedFrom' ? 'Select Issued From' : 'Select Issued To'}
                    </Text>
                  </View>
                  {filters[activeDateField] ? (
                    <TouchableOpacity onPress={() => handleDatePick(activeDateField, '')}>
                      <Text style={styles.clearDateText}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Calendar
                  markedDates={markedDates}
                  onDayPress={day => handleDatePick(activeDateField, day.dateString)}
                  theme={{
                    backgroundColor: '#ffffff',
                    calendarBackground: '#ffffff',
                    todayTextColor: '#2563eb',
                    arrowColor: '#2563eb',
                    selectedDayBackgroundColor: '#2563eb',
                    selectedDayTextColor: '#ffffff',
                    textDayFontWeight: '500',
                    textMonthFontWeight: '700',
                    textDayHeaderFontWeight: '600',
                  }}
                />
              </View>
            )}
          </ScrollView>
        </SideFilterSheet>

        <TouchableOpacity style={styles.fab} onPress={() => router.push('../Screens/CreateInvoiceScreen')} activeOpacity={0.8}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  // Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  businessSummary: { marginTop: 4, fontSize: 13, color: '#64748b', fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  // Main Scroll
  mainScroll: { flex: 1 },
  mainScrollContent: { paddingBottom: 120 },

  // Analytics
  analyticsSection: { paddingHorizontal: 20, paddingBottom: 24 },
  heroAnalyticCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroAnalyticLabel: { fontSize: 13, fontWeight: '600', color: '#cbd5e1' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  heroAnalyticValue: { fontSize: 28, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5 },

  analyticsGrid: { flexDirection: 'row', gap: 12 },
  analyticCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1,
  },
  analyticLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  analyticValue: { fontSize: 18, fontWeight: '700', color: '#0f172a', letterSpacing: -0.5 },

  // Sticky Header (Search + Filters)
  stickyHeaderContainer: {
    backgroundColor: '#ffffff',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    zIndex: 10,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500' },
  filterButton: {
    width: 48, height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  filterButtonActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#ffffff',
  },
  filterBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },

  statusScroller: { paddingHorizontal: 20 },
  statusRow: { paddingHorizontal: 20, gap: 8, paddingRight: 40 },
  statusChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  statusChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  statusChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  statusChipTextActive: { color: '#ffffff' },

  // List Content
  listContent: { paddingHorizontal: 20, paddingTop: 16 },

  // Swipeable & Cards
  swipeableContainer: { marginBottom: 12, borderRadius: 16 },
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 12,
  },
  swipeAction: {
    width: 70,
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  swipeActionText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 4 },

  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  invoiceCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invoiceIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#eff6ff',
    borderWidth: 1, borderColor: '#dbeafe',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  invoiceInfoLeft: { flex: 1, paddingRight: 16 },
  customerName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4, letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  invoiceNumber: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1' },
  jobRef: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  
  invoiceInfoRight: { alignItems: 'flex-end' },
  footerAmount: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  
  invoiceCardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  footerDate: { fontSize: 14, fontWeight: '600', color: '#475569' },
  overdueText: { color: '#ef4444' },
  overdueIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444', marginLeft: 2 },

  // Skeletons
  skeletonContainer: { gap: 12 },
  skeletonBlock: { backgroundColor: '#f1f5f9' },

  // Empty State
  emptyCard: {
    marginTop: 32,
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1',
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#f8fafc',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  emptyText: { marginTop: 8, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },

  // Error State
  stateContainer: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  stateText: { marginTop: 8, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  retryButton: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  retryButtonText: { color: '#ffffff', fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', right: 24, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },

  // Filters
  filterContent: { paddingBottom: 32 },
  filterSection: { marginBottom: 24 },
  filterLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  presetChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  presetChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  presetChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  presetChipTextActive: { color: '#ffffff' },
  dateColumn: { marginTop: 12, gap: 10 },
  dateCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: 16,
  },
  dateCardActive: { borderColor: '#2563eb', backgroundColor: '#ffffff' },
  dateCardLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
  dateCardValue: { marginTop: 6, fontSize: 15, color: '#0f172a', fontWeight: '700' },
  calendarCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: 16,
    marginTop: 8,
  },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calendarTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  clearDateText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
});

export default InvoicesScreen;
