import { router } from 'expo-router';
import { FileText, Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const getInvoiceTitle = (invoice: InvoiceResponse) =>
  invoice.customer?.displayName?.trim() ||
  invoice.customerNameSnapshot?.trim() ||
  'Unnamed customer';

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
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

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

  const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  const activeFilterCount = useMemo(
    () => [Boolean(filters.issuedFrom), Boolean(filters.issuedTo)].filter(Boolean).length,
    [filters]
  );

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
    setFilters(current => ({
      ...current,
      issuedFrom: range.issuedFrom,
      issuedTo: range.issuedTo,
    }));
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <Text style={styles.subtitle}>{formatInvoiceCurrency(totalRevenue)} tracked in current list</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by invoice, customer, or job"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <SlidersHorizontal size={20} color={showFilters ? '#ffffff' : '#64748b'} />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
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
          >
            <Text style={[styles.statusChipText, filters.status === status && styles.statusChipTextActive]}>
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.stateText}>Loading invoices...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Unable to load invoices</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadInvoices()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadInvoices(true)} />}
        >
          {invoices.length === 0 ? (
            <View style={styles.emptyCard}>
              <FileText size={32} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No invoices found</Text>
              <Text style={styles.emptyText}>
                {searchQuery.trim() || activeFilterCount > 0 || filters.status !== 'All'
                  ? 'Try a different search or adjust the filters.'
                  : 'Create your first invoice to start tracking billing.'}
              </Text>
            </View>
          ) : (
            invoices.map(invoice => {
              const tone = getInvoiceStatusTone(invoice.status);
              return (
                <TouchableOpacity
                  key={invoice.id || invoice.invoiceNumber}
                  style={styles.card}
                  onPress={() => openInvoice(invoice.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.iconWrap}>
                      <FileText size={20} color="#2563eb" />
                    </View>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardTitle}>{getInvoiceTitle(invoice)}</Text>
                      <Text style={styles.cardSubtitle}>{getInvoiceNumber(invoice)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                      <Text style={[styles.statusText, { color: tone.text }]}>
                        {formatInvoiceStatusLabel(invoice.status).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.footerLabel}>Due Date</Text>
                      <Text style={styles.footerValue}>{formatDisplayDate(invoice.dueOn)}</Text>
                    </View>
                    <Text style={styles.amountText}>{formatInvoiceCurrency(invoice.totalAmount)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <SideFilterSheet
        visible={showFilters}
        title="Filters"
        subtitle="Use issued date filters here. Status stays below the search bar for faster switching."
        badgeCount={activeFilterCount}
        onClose={() => setShowFilters(false)}
        onClear={activeFilterCount > 0 ? clearDateFilters : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Issued Date</Text>
            <Text style={styles.filterHelper}>Pick a quick date range or switch to custom dates.</Text>

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

          {activeDateField ? (
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <View>
                  <Text style={styles.calendarTitle}>
                    {activeDateField === 'issuedFrom' ? 'Select Issued From' : 'Select Issued To'}
                  </Text>
                  <Text style={styles.calendarCaption}>Tap one date to update this filter.</Text>
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
                  backgroundColor: '#f8fafc',
                  calendarBackground: '#f8fafc',
                  todayTextColor: '#2563eb',
                  arrowColor: '#2563eb',
                  selectedDayBackgroundColor: '#2563eb',
                  selectedDayTextColor: '#ffffff',
                  textDayFontWeight: '600',
                  textMonthFontWeight: '900',
                  textDayHeaderFontWeight: '700',
                }}
              />
            </View>
          ) : null}
        </ScrollView>
      </SideFilterSheet>

      <TouchableOpacity style={styles.fab} onPress={() => router.push('../Screens/CreateInvoiceScreen')}>
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 15, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 4, fontSize: 13, color: '#64748b', fontWeight: '600' },
  searchRow: { paddingHorizontal: 15, paddingTop: 8, flexDirection: 'row', gap: 12 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 54,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '600' },
  filterButton: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  statusScroller: { marginTop: 14, maxHeight: 35 },
  statusRow: { paddingHorizontal: 20, gap: 10, paddingRight: 30 },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  statusChipText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  statusChipTextActive: {
    color: '#ffffff',
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 120 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', },
  cardSubtitle: { marginTop: 4, fontSize: 12, color: '#64748b', fontWeight: '600' },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  cardFooter: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' },
  footerValue: { marginTop: 4, fontSize: 14, color: '#0f172a', fontWeight: '700' },
  amountText: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  stateContainer: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyCard: {
    marginTop: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 15,
    paddingVertical: 36,
  },
  emptyTitle: { marginTop: 14, fontSize: 20, fontWeight: '800', color: '#0f172a' },
  emptyText: { marginTop: 8, fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  filterContent: {
    paddingBottom: 24,
  },
  filterSection: {
    marginBottom: 22,
  },
  filterLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterHelper: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#1d4ed8',
  },
  dateColumn: {
    marginTop: 14,
    gap: 12,
  },
  dateCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  dateCardActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  dateCardLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dateCardValue: {
    marginTop: 8,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '700',
  },
  calendarCard: {
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
    paddingHorizontal: 4,
  },
  calendarTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  calendarCaption: { marginTop: 4, fontSize: 12, color: '#64748b', fontWeight: '600' },
  clearDateText: { fontSize: 12, fontWeight: '800', color: '#2563eb' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});

export default InvoicesScreen;
