import { router } from 'expo-router';
import {
  Briefcase,
  ChevronRight,
  Clock,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  User,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobResponse, PostApiJobsGetAllJobsParams } from '@/src/api/generated';
import JobsViewSwitcher from '@/src/components/JobsViewSwitcher';
import SideFilterSheet from '@/src/components/SideFilterSheet';
import { getJobCustomerName, getJobDisplayTitle, getJobsApi } from '@/src/services/jobService';

// Date filter presets
const DATE_PRESET_OPTIONS = ['This Week', 'This Month', '3 Months', 'Custom Range'] as const;
type DatePresetOption = (typeof DATE_PRESET_OPTIONS)[number] | null;
type DateFieldKey = 'scheduledFrom' | 'scheduledTo';

type StatusFilter = 'All' | 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';

type JobCardModel = {
  id: string;
  title: string;
  customer: string;
  dateLabel: string;
  timeLabel: string;
  status: string;
  typeLabel: string;
  dateParts: { day: string; month: string };
};

const PAGE_SIZE = 10;
const STATUS_FILTERS: StatusFilter[] = ['All', 'Scheduled', 'InProgress', 'Completed', 'Cancelled'];

// Helper functions
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
      scheduledFrom: toDateKey(getStartOfWeek(today)),
      scheduledTo: toDateKey(end),
    };
  }
  if (preset === 'This Month') {
    return {
      scheduledFrom: toDateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
      scheduledTo: toDateKey(end),
    };
  }
  if (preset === '3 Months') {
    return {
      scheduledFrom: toDateKey(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      scheduledTo: toDateKey(end),
    };
  }
  return {
    scheduledFrom: '',
    scheduledTo: '',
  };
};

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

const formatJobDate = (value?: string | null) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatJobTimeRange = (start?: string | null, end?: string | null) => {
  if (!start) return 'No time';
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return 'No time';
  const startLabel = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(startDate);
  if (!end) return startLabel;
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startLabel;
  const endLabel = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(endDate);
  return `${startLabel} - ${endLabel}`;
};

const mapJobToCard = (job: JobResponse): JobCardModel => {
  const start = job.scheduledStartAt ? new Date(job.scheduledStartAt) : null;
  let day = '--';
  let month = 'TBD';
  if (start && !Number.isNaN(start.getTime())) {
    day = new Intl.DateTimeFormat('en-US', { day: '2-digit' }).format(start);
    month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(start).toUpperCase();
  }

  return {
    id: job.id || job.jobNumber || Math.random().toString(),
    title: getJobDisplayTitle(job),
    customer: getJobCustomerName(job),
    dateLabel: formatJobDate(job.scheduledStartAt),
    timeLabel: formatJobTimeRange(job.scheduledStartAt, job.scheduledEndAt),
    status: job.status?.trim() || 'Scheduled',
    typeLabel: job.jobType?.trim() || 'General',
    dateParts: { day, month },
  };
};

const getStatusStyles = (status: string) => {
  switch (status.toLowerCase()) {
    case 'inprogress':
      return { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe' };
    case 'scheduled':
      return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    case 'completed':
      return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    case 'cancelled':
      return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
    default:
      return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
  }
};

// Skeleton components
const SkeletonBlock = ({
  height,
  width,
  style,
}: {
  height: number;
  width: number | `${number}%`;
  style?: object;
}) => <View style={[styles.skeletonBlock, { height, width }, style]} />;

const JobCardSkeleton = () => (
  <View style={styles.jobCard}>
    <View style={styles.cardHeader}>
      <SkeletonBlock height={56} width={56} style={{ borderRadius: 14 }} />
      <View style={styles.cardMain}>
        <View style={styles.titleRow}>
          <SkeletonBlock height={20} width="60%" />
          <SkeletonBlock height={24} width={70} style={{ borderRadius: 8 }} />
        </View>
        <SkeletonBlock height={16} width="45%" style={{ marginTop: 4 }} />
        <SkeletonBlock height={16} width="35%" style={{ marginTop: 4 }} />
      </View>
    </View>
    <View style={styles.cardDivider} />
    <View style={styles.cardFooter}>
      <SkeletonBlock height={28} width={80} style={{ borderRadius: 8 }} />
      <SkeletonBlock height={16} width={16} style={{ borderRadius: 8 }} />
    </View>
  </View>
);

const JobsSkeleton = () => (
  <View style={styles.scrollContent}>
    {[0, 1, 2].map(item => (
      <JobCardSkeleton key={item} />
    ))}
  </View>
);

const EmptyState = ({ loading }: { loading: boolean }) => (
  <View style={styles.emptyState}>
    {!loading ? (
      <>
        <View style={styles.emptyIconBox}>
          <Briefcase size={40} color="#2563eb" strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>No jobs found</Text>
        <Text style={styles.emptySubtitle}>We couldn't find any jobs matching your criteria. Try adjusting the filters or search term.</Text>
      </>
    ) : null}
  </View>
);

const JobList: React.FC = () => {
  const isFetchingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('All');
  const [jobs, setJobs] = useState<JobCardModel[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Filter sheet state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetOption>(null);
  const [activeDateField, setActiveDateField] = useState<DateFieldKey | null>(null);
  const [scheduleFrom, setScheduleFrom] = useState<string | undefined>();
  const [scheduleTo, setScheduleTo] = useState<string | undefined>();

  const activeFilterCount = useMemo(
    () => [scheduleFrom, scheduleTo].filter(Boolean).length,
    [scheduleFrom, scheduleTo]
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const requestFilters = useMemo<PostApiJobsGetAllJobsParams>(
    () => ({
      PageNumber: 1,
      PageSize: PAGE_SIZE,
      Search: debouncedSearch || undefined,
      Status: activeFilter === 'All' ? undefined : activeFilter,
      ScheduledFrom: scheduleFrom,
      ScheduledTo: scheduleTo,
    }),
    [activeFilter, debouncedSearch, scheduleFrom, scheduleTo]
  );

  const fetchJobs = useCallback(async (
    nextPage: number,
    mode: 'initial' | 'refresh' | 'loadMore' = 'initial'
  ) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);
    if (mode === 'loadMore') setIsLoadingMore(true);

    try {
      const response = await getJobsApi({
        ...requestFilters,
        PageNumber: nextPage,
      });

      const mappedJobs = response.data.map(mapJobToCard);
      const loadedCount = (response.pageNumber - 1) * response.pageSize + mappedJobs.length;

      setJobs(current => (nextPage === 1 ? mappedJobs : [...current, ...mappedJobs]));
      setPageNumber(response.pageNumber);
      setTotalRecords(response.totalRecords);
      setHasMore(loadedCount < response.totalRecords && mappedJobs.length > 0);
      setError('');
    } catch (fetchError: any) {
      setError(fetchError?.message || 'Failed to load jobs.');
      if (nextPage === 1) {
        setJobs([]);
        setTotalRecords(0);
        setHasMore(false);
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [requestFilters]);

  // Initial fetch & refetch when filters change
  useEffect(() => {
    setJobs([]);
    setPageNumber(1);
    setHasMore(true);
    fetchJobs(1, 'initial');
  }, [fetchJobs]);

  const handleRefresh = () => {
    fetchJobs(1, 'refresh');
  };

  const handleLoadMore = () => {
    if (!isLoading && !isRefreshing && !isLoadingMore && hasMore) {
      fetchJobs(pageNumber + 1, 'loadMore');
    }
  };

  const clearDateFilters = () => {
    setScheduleFrom(undefined);
    setScheduleTo(undefined);
    setSelectedDatePreset(null);
    setActiveDateField(null);
  };

  const applyDatePreset = (preset: Exclude<DatePresetOption, null>) => {
    if (preset === 'Custom Range') {
      setSelectedDatePreset(preset);
      setActiveDateField('scheduledFrom');
      return;
    }

    const range = getDatePresetRange(preset);
    setScheduleFrom(range.scheduledFrom);
    setScheduleTo(range.scheduledTo);
    setSelectedDatePreset(preset);
    setActiveDateField(null);
  };

  const handleDatePick = (field: DateFieldKey, value: string) => {
    if (field === 'scheduledFrom') {
      setScheduleFrom(value);
    } else {
      setScheduleTo(value);
    }
    setSelectedDatePreset('Custom Range');
  };

  const titleCountLabel = activeFilter === 'All' ? 'TOTAL JOBS' : `${activeFilter.toUpperCase()} JOBS`;

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.titleText}>Jobs</Text>
            <Text style={styles.subtitleText}>{totalRecords} {titleCountLabel}</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn}>
            <MoreHorizontal size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <JobsViewSwitcher activeView="list" />

        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Search size={18} color="#cbd5e1" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs or customers..."
              placeholderTextColor="#cbd5e1"
              value={searchInput}
              onChangeText={setSearchInput}
            />
            {!!searchInput && (
              <TouchableOpacity onPress={() => setSearchInput('')}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <SlidersHorizontal size={20} color={showFilters ? '#ffffff' : '#64748b'} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={STATUS_FILTERS}
          horizontal
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsContainer}
          renderItem={({ item }) => {
            const isActive = activeFilter === item;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {isLoading && jobs.length === 0 ? (
        <JobsSkeleton />
      ) : (
        <FlatList
          ref={flatListRef}
          data={jobs}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const statusStyle = getStatusStyles(item.status);
            return (
              <TouchableOpacity
                style={[styles.jobCard]}
                activeOpacity={0.7}
                onPress={() => {
                  router.push({
                    pathname: '../Screens/JobDetailScreen',
                    params: { jobId: item.id },
                  });
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.dateBlock}>
                    <Text style={styles.dateMonth}>{item.dateParts.month}</Text>
                    <Text style={styles.dateDay}>{item.dateParts.day}</Text>
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.titleRow}>
                      <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
                      </View>
                    </View>

                    <View style={styles.customerRow}>
                      <User size={14} color="#64748b" />
                      <Text style={styles.customerName} numberOfLines={1}>{item.customer}</Text>
                    </View>

                    <View style={styles.timeRow}>
                      <Clock size={14} color="#64748b" />
                      <Text style={styles.timeText}>{item.timeLabel}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                  <View style={styles.typeBadge}>
                    <Briefcase size={12} color="#64748b" />
                    <Text style={styles.typeText}>{item.typeLabel}</Text>
                  </View>
                  <ChevronRight size={18} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#2563eb" />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={<EmptyState loading={isLoading} />}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <SkeletonBlock height={28} width={28} style={styles.footerSkeleton} />
              </View>
            ) : jobs.length > 0 && !hasMore ? (
              <Text style={styles.endText}>You have reached the end of the list.</Text>
            ) : null
          }
        />
      )}

      <SideFilterSheet
        visible={showFilters}
        title="Filters"
        subtitle="Filter jobs by scheduled date range."
        badgeCount={activeFilterCount}
        onClose={() => setShowFilters(false)}
        onClear={activeFilterCount > 0 ? clearDateFilters : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Scheduled Date</Text>
            <Text style={styles.filterHelper}>Pick a quick range or set custom dates.</Text>

            <View style={styles.presetGrid}>
              {DATE_PRESET_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.presetChip, selectedDatePreset === option && styles.presetChipActive]}
                  onPress={() => applyDatePreset(option)}
                >
                  <Text style={[styles.presetChipText, selectedDatePreset === option && styles.presetChipTextActive]}>
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
                style={[styles.dateCard, activeDateField === 'scheduledFrom' && styles.dateCardActive]}
                onPress={() => setActiveDateField(current => (current === 'scheduledFrom' ? null : 'scheduledFrom'))}
              >
                <Text style={styles.dateCardLabel}>Scheduled From</Text>
                <Text style={styles.dateCardValue}>
                  {scheduleFrom ? formatFilterDateLabel(scheduleFrom) : 'Select date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateCard, activeDateField === 'scheduledTo' && styles.dateCardActive]}
                onPress={() => setActiveDateField(current => (current === 'scheduledTo' ? null : 'scheduledTo'))}
              >
                <Text style={styles.dateCardLabel}>Scheduled To</Text>
                <Text style={styles.dateCardValue}>
                  {scheduleTo ? formatFilterDateLabel(scheduleTo) : 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {activeDateField && (
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <View>
                  <Text style={styles.calendarTitle}>
                    {activeDateField === 'scheduledFrom' ? 'Select Scheduled From' : 'Select Scheduled To'}
                  </Text>
                  <Text style={styles.calendarCaption}>Tap one date to update this filter.</Text>
                </View>

                {(activeDateField === 'scheduledFrom' ? scheduleFrom : scheduleTo) && (
                  <TouchableOpacity onPress={() => handleDatePick(activeDateField, '')}>
                    <Text style={styles.clearDateText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              <RNCalendar
                markedDates={{
                  ...(activeDateField === 'scheduledFrom' && scheduleFrom && {
                    [scheduleFrom]: { selected: true, selectedColor: '#2563eb' },
                  }),
                  ...(activeDateField === 'scheduledTo' && scheduleTo && {
                    [scheduleTo]: { selected: true, selectedColor: '#2563eb' },
                  }),
                }}
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
          )}
        </ScrollView>
      </SideFilterSheet>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => {
          router.push('../Screens/CreateJobScreen');
        }}
      >
        <Plus size={24} color="white" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#ffffff' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  titleText: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subtitleText: { marginTop: 4, fontSize: 14, color: '#64748b', fontWeight: '600' },
  moreBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 12 },
  searchWrapper: {
    flex: 1,
    height: 52,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 15, color: '#0f172a', fontWeight: '500' },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
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
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  filterChipsContainer: { paddingRight: 24, gap: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chipTextActive: { color: '#ffffff' },
  errorBox: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorText: { fontSize: 13, color: '#b91c1c', fontWeight: '700' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120, gap: 16, flexGrow: 1, paddingTop: 10 },

  jobCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  dateBlock: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: { fontSize: 11, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' },
  dateDay: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: -2 },

  cardMain: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  jobTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: '#0f172a', lineHeight: 22 },
  statusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 14, fontWeight: '600', color: '#475569', flex: 1 },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontSize: 13, fontWeight: '600', color: '#64748b' },

  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  typeText: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },

  emptyState: { paddingHorizontal: 24, paddingTop: 60, alignItems: 'center' },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  skeletonBlock: { backgroundColor: '#e2e8f0', borderRadius: 999 },
  skeletonBadge: { borderRadius: 999 },
  footerLoader: { paddingVertical: 8 },
  footerSkeleton: { borderRadius: 999, alignSelf: 'center' },
  endText: { textAlign: 'center', color: '#94a3b8', fontSize: 12, fontWeight: '700', paddingBottom: 12 },
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
  // Filter sheet styles
  filterContent: { paddingBottom: 24 },
  filterSection: { marginBottom: 22 },
  filterLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterHelper: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#64748b', fontWeight: '600' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipActive: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  presetChipText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  presetChipTextActive: { color: '#1d4ed8' },
  dateColumn: { marginTop: 14, gap: 12 },
  dateCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  dateCardActive: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  dateCardLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' },
  dateCardValue: { marginTop: 8, fontSize: 15, color: '#0f172a', fontWeight: '700' },
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
});

export default JobList;
