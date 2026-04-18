import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  Briefcase,
  Calendar,
  ChevronRight,
  Clock,
  MoreHorizontal,
  Plus,
  Search,
  User,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobResponse, PostApiJobsGetAllJobsParams } from '@/src/api/generated';
import { getJobCustomerName, getJobDisplayTitle, getJobsApi } from '@/src/services/jobService';
import { Calendar as RNCalendar } from 'react-native-calendars';
type StatusFilter = 'All' | 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled';

type JobCardModel = {
  id: string;
  title: string;
  customer: string;
  dateLabel: string;
  timeLabel: string;
  status: string;
  typeLabel: string;
};

const PAGE_SIZE = 10;
const STATUS_FILTERS: StatusFilter[] = ['All', 'Scheduled', 'InProgress', 'Completed', 'Cancelled'];

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

  if (!end) {
    return startLabel;
  }

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) {
    return startLabel;
  }

  const endLabel = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(endDate);

  return `${startLabel} - ${endLabel}`;
};

const mapJobToCard = (job: JobResponse): JobCardModel => ({
  id: job.id || job.jobNumber || Math.random().toString(),
  title: getJobDisplayTitle(job),
  customer: getJobCustomerName(job),
  dateLabel: formatJobDate(job.scheduledStartAt),
  timeLabel: formatJobTimeRange(job.scheduledStartAt, job.scheduledEndAt),
  status: job.status?.trim() || 'Scheduled',
  typeLabel: job.jobType?.trim() || 'General',
});

const getStatusStyles = (status: string) => {
  switch (status) {
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
    <View style={styles.cardTop}>
      <View style={styles.cardTitleInfo}>
        <SkeletonBlock height={20} width="68%" />
        <View style={styles.customerRow}>
          <SkeletonBlock height={12} width="40%" />
        </View>
      </View>
      <SkeletonBlock height={24} width={92} style={styles.skeletonBadge} />
    </View>

    <View style={styles.cardDivider} />

    <View style={styles.cardBottom}>
      <View style={styles.metaInfoRow}>
        <View style={styles.metaItem}>
          <SkeletonBlock height={12} width={64} />
        </View>
        <View style={styles.metaItem}>
          <SkeletonBlock height={12} width={92} />
        </View>
      </View>
      <SkeletonBlock height={18} width={18} style={{ borderRadius: 9 }} />
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
          <Briefcase size={32} color="#cbd5e1" />
        </View>
        <Text style={styles.emptyTitle}>No jobs found</Text>
        <Text style={styles.emptySubtitle}>Try a different search or change the filters.</Text>
      </>
    ) : null}
  </View>
);

const JobList: React.FC = () => {
  const isFetchingRef = useRef(false);
  const hasFocusedOnceRef = useRef(false);
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [scheduleFrom, setScheduleFrom] = useState<string | undefined>();
  const [scheduleTo, setScheduleTo] = useState<string | undefined>();
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
    [activeFilter, debouncedSearch]
  );

  const fetchJobs = useCallback(async (
    nextPage: number,
    mode: 'initial' | 'refresh' | 'loadMore' = 'initial'
  ) => {
    if (isFetchingRef.current) {
      return;
    }

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

  useEffect(() => {
    setJobs([]);
    setPageNumber(1);
    setHasMore(true);
    fetchJobs(1, 'initial');
  }, [fetchJobs]);
  useEffect(() => {
    setJobs([]);
    setPageNumber(1);
    setHasMore(true);
    fetchJobs(1, 'initial');
  }, [scheduleFrom, scheduleTo]);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      flatListRef.current?.scrollToIndex({ index: 0, animated: false });
      fetchJobs(1, 'refresh');
    }, [fetchJobs])
  );

  const handleRefresh = () => {
    fetchJobs(1, 'refresh');
  };

  const handleLoadMore = () => {
    if (!isLoading && !isRefreshing && !isLoadingMore && hasMore) {
      fetchJobs(pageNumber + 1, 'loadMore');
    }
  };

  const titleCountLabel = activeFilter === 'All' ? 'TOTAL JOBS' : `${activeFilter.toUpperCase()} JOBS`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.titleText}>Job List</Text>
            <Text style={styles.subtitleText}>{totalRecords} {titleCountLabel}</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn}>
            <MoreHorizontal size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

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
            style={styles.filterSettingsBtn}
            onPress={() => setShowCalendar(prev => !prev)}
          >
            <Calendar size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
        {showCalendar && (
          <View style={{ marginBottom: 15 }}>
            <RNCalendar
              onDayPress={(day) => {
                if (!scheduleFrom || (scheduleFrom && scheduleTo)) {
                  // start new range
                  setScheduleFrom(day.dateString);
                  setScheduleTo(undefined);
                } else {
                  // set end date
                  setScheduleTo(day.dateString);
                }
              }}
              markedDates={{
                ...(scheduleFrom && {
                  [scheduleFrom]: { startingDay: true, color: '#2563eb', textColor: 'white' },
                }),
                ...(scheduleTo && {
                  [scheduleTo]: { endingDay: true, color: '#2563eb', textColor: 'white' },
                }),
              }}
              markingType={'period'}
            />
          </View>
        )}
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
                activeOpacity={0.9}
                onPress={() => {
                  router.push({
                    pathname: '../Screens/JobDetailScreen',
                    params: { jobId: item.id },
                  });
                }}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleInfo}>
                    <Text style={styles.jobTitle}>{item.title}</Text>
                    <View style={styles.customerRow}>
                      <User size={12} color="#cbd5e1" />
                      <Text style={styles.customerName}>{item.customer}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottom}>
                  <View style={styles.metaInfoRow}>
                    <View style={styles.metaItem}>
                      <Calendar size={13} color="#cbd5e1" />
                      <Text style={styles.metaText}>{item.dateLabel}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Clock size={13} color="#cbd5e1" />
                      <Text style={styles.metaText}>{item.timeLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.typeRow}>
                    <Text style={styles.typeText}>{item.typeLabel}</Text>
                    <ChevronRight size={16} color="#cbd5e1" />
                  </View>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 15, paddingTop: 5, paddingBottom: 15, backgroundColor: '#F8FAFC' },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  titleText: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  subtitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  moreBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  searchWrapper: {
    flex: 1,
    height: 56,
    backgroundColor: 'white',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, fontWeight: '700', color: '#0f172a' },
  filterSettingsBtn: {
    width: 56,
    height: 56,
    backgroundColor: 'white',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  filterChipsContainer: { paddingRight: 24, gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  chipTextActive: { color: 'white' },
  errorBox: {
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: { fontSize: 12, color: '#b91c1c', fontWeight: '700' },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 120, gap: 16, flexGrow: 1 },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitleInfo: { flex: 1, gap: 10 },
  jobTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', lineHeight: 22 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  cardDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  metaInfoRow: { flex: 1, gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeText: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
  emptyState: { paddingHorizontal: 24, paddingTop: 80, alignItems: 'center' },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  skeletonBlock: { backgroundColor: '#e2e8f0', borderRadius: 999 },
  skeletonBadge: { borderRadius: 999 },
  footerLoader: { paddingVertical: 8 },
  footerSkeleton: { borderRadius: 999, alignSelf: 'center' },
  endText: { textAlign: 'center', color: '#94a3b8', fontSize: 12, fontWeight: '700', paddingBottom: 12 },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    height: 64,
    borderRadius: 22,
    shadowColor: '#2563eb',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  fabText: { color: 'white', fontSize: 14, fontWeight: '800' },
});

export default JobList;
