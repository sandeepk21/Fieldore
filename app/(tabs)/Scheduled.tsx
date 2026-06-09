import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MoreHorizontal,
  Navigation,
  Plus,
  RefreshCw,
  User,
  XCircle,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobResponse } from '@/src/api/generated';
import JobsViewSwitcher from '@/src/components/JobsViewSwitcher';
import { getJobCustomerName, getJobDisplayTitle, getJobsApi } from '@/src/services/jobService';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

type CalendarJob = {
  id: string;
  jobNumber: string;
  jobType: string;
  priority: string;
  title: string;
  client: string;
  address: string;
  status: string;
  time: string;
  color: 'blue' | 'amber' | 'green' | 'red' | 'slate' | 'orange';
  dateKey: string;
  sortTimestamp: number;
};

type JobsByDate = Record<string, CalendarJob[]>;

type FetchMode = 'initial' | 'refresh';

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const pad = (value: number) => `${value}`.padStart(2, '0');

const toDateKeyLocal = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseApiDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);

const formatAgendaDate = (dateKey: string) => {
  const parsed = parseApiDate(`${dateKey}T00:00:00`);
  if (!parsed) return dateKey;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parsed);
};

const formatTimeLabel = (start?: string | null, end?: string | null) => {
  const startDate = parseApiDate(start);
  if (!startDate) return 'No time';

  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const startLabel = formatter.format(startDate);
  const endDate = parseApiDate(end);
  if (!endDate) return startLabel;

  return `${startLabel} - ${formatter.format(endDate)}`;
};

const getStatusColor = (status?: string | null): CalendarJob['color'] => {
  const normalized = status?.trim().toLowerCase().replace(/\s+/g, '');

  switch (normalized) {
    case 'inprogress':
      return 'orange';
    case 'scheduled':
      return 'slate';
    case 'completed':
      return 'green';
    case 'cancelled':
      return 'red';
    default:
      return 'slate';
  }
};

const STATUS_COLORS = {
  orange: { bg: '#fff7ed', text: '#ea580c', border: '#fdba74', icon: '#f97316' },
  slate: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1', icon: '#64748b' },
  green: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac', icon: '#22c55e' },
  red: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', icon: '#ef4444' },
  blue: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', icon: '#3b82f6' },
  amber: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', icon: '#f59e0b' },
};

const normalizeStatusLabel = (status?: string | null) => {
  if (!status?.trim()) return 'Scheduled';
  if (status.trim().toLowerCase().replace(/\s+/g, '') === 'inprogress') return 'In Progress';
  return status.trim();
};

const capitalizeWords = (str: string) => {
  if (!str) return str;
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

const mapJobToCalendar = (job: JobResponse): CalendarJob | null => {
  const scheduledStart = parseApiDate(job.scheduledStartAt);
  if (!scheduledStart) return null;

  const id = job.id?.trim() || job.jobNumber?.trim();
  if (!id) return null;

  const addressParts = [job.serviceAddress?.line1, job.serviceAddress?.city].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(', ') : 'No Address';

  const normalizedStatus = normalizeStatusLabel(job.status);
  let color: CalendarJob['color'] = getStatusColor(job.status);

  return {
    id,
    jobNumber: job.jobNumber || '',
    jobType: job.jobType || 'General',
    priority: job.priority || 'Normal',
    title: capitalizeWords(getJobDisplayTitle(job)),
    client: capitalizeWords(getJobCustomerName(job)),
    address,
    status: normalizedStatus,
    time: formatTimeLabel(job.scheduledStartAt, job.scheduledEndAt),
    color,
    dateKey: toDateKeyLocal(scheduledStart),
    sortTimestamp: scheduledStart.getTime(),
  };
};

const getDaysInMonth = (month: Date) => {
  const lastDay = endOfMonth(month).getDate();
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return Array.from({ length: lastDay }, (_, i) => {
    const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
    return {
      dateKey: toDateKeyLocal(d),
      dayOfWeek: daysOfWeek[d.getDay()],
      dayNumber: d.getDate(),
      date: d,
    };
  });
};

const buildDefaultSelectedDateKey = (month: Date) => {
  const today = new Date();
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  return isCurrentMonth ? toDateKeyLocal(today) : toDateKeyLocal(startOfMonth(month));
};

const JobCardSkeleton = () => (
  <View style={styles.jobCard}>
    <View style={styles.skeletonHeader}>
      <View style={[styles.skeletonLine, { width: 120, height: 24, borderRadius: 12 }]} />
      <View style={[styles.skeletonLine, { width: 80, height: 24, borderRadius: 12 }]} />
    </View>
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, styles.skeletonTitle]} />
      <View style={[styles.skeletonLine, styles.skeletonClient]} />
    </View>
    <View style={styles.divider} />
    <View style={styles.skeletonFooter}>
      <View style={[styles.skeletonLine, { width: 100, height: 16 }]} />
      <View style={[styles.skeletonLine, { width: 80, height: 16 }]} />
    </View>
  </View>
);

const EmptyAgendaState = ({
  selectedDay,
  selectedDateKey,
  loading,
}: {
  selectedDay: number | null;
  selectedDateKey: string;
  loading: boolean;
}) => {
  if (loading) {
    return (
      <View style={styles.agendaContent}>
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBox}>
        <Zap size={32} color="#cbd5e1" />
      </View>
      <Text style={styles.emptyTitle}>No jobs scheduled</Text>
      <Text style={styles.emptySubtitle}>
        {selectedDay ? `Nothing booked for ${formatAgendaDate(selectedDateKey)}.` : 'Pick a date to view jobs.'}
      </Text>
    </View>
  );
};

const Scheduled: React.FC = () => {
  const agendaListRef = useRef<FlatList<CalendarJob>>(null);
  const daysScrollRef = useRef<ScrollView>(null);
  const isFetchingRef = useRef(false);
  const requestIdRef = useRef(0);
  const hasFocusedOnceRef = useRef(false);

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    buildDefaultSelectedDateKey(startOfMonth(new Date()))
  );
  const [jobs, setJobs] = useState<CalendarJob[]>([]);
  const [monthJobCount, setMonthJobCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const monthLabel = useMemo(() => formatMonthLabel(currentMonth), [currentMonth]);
  const daysInMonthList = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

  const jobsByDate = useMemo<JobsByDate>(() => {
    return jobs.reduce<JobsByDate>((acc, job) => {
      if (!acc[job.dateKey]) {
        acc[job.dateKey] = [];
      }
      acc[job.dateKey].push(job);
      return acc;
    }, {});
  }, [jobs]);

  const selectedJobs = useMemo(
    () => (jobsByDate[selectedDateKey] || []).slice().sort((a, b) => a.sortTimestamp - b.sortTimestamp),
    [jobsByDate, selectedDateKey]
  );

  const selectedDay = useMemo(() => {
    const parsed = parseApiDate(`${selectedDateKey}T00:00:00`);
    return parsed ? parsed.getDate() : null;
  }, [selectedDateKey]);

  // Scroll to selected date in the horizontal scroll view
  useEffect(() => {
    if (selectedDay && daysScrollRef.current) {
      // Approximate position: each day item is ~60px wide + some gap
      const itemWidth = 60;
      const offset = (selectedDay - 1) * itemWidth - (width / 2) + (itemWidth / 2);
      daysScrollRef.current.scrollTo({ x: Math.max(0, offset), animated: true });
    }
  }, [selectedDay, currentMonth]);

  const fetchMonthJobs = useCallback(
    async (month: Date, mode: FetchMode = 'initial') => {
      if (isFetchingRef.current) return;

      isFetchingRef.current = true;
      const nextRequestId = requestIdRef.current + 1;
      requestIdRef.current = nextRequestId;

      if (mode === 'initial') setIsLoading(true);
      if (mode === 'refresh') setIsRefreshing(true);

      try {
        const scheduledFrom = toDateKeyLocal(startOfMonth(month));
        const scheduledTo = toDateKeyLocal(endOfMonth(month));
        const collected: JobResponse[] = [];
        let pageNumber = 1;
        let totalRecords = 0;

        while (pageNumber <= MAX_PAGES) {
          const response = await getJobsApi({
            PageNumber: pageNumber,
            PageSize: PAGE_SIZE,
            ScheduledFrom: scheduledFrom,
            ScheduledTo: scheduledTo,
          });

          collected.push(...response.data);
          totalRecords = response.totalRecords;

          const loadedCount = (response.pageNumber - 1) * response.pageSize + response.data.length;
          const reachedEnd = loadedCount >= totalRecords || response.data.length === 0;

          if (reachedEnd) break;
          pageNumber += 1;
        }

        if (requestIdRef.current !== nextRequestId) {
          return;
        }

        const nextJobs = collected
          .map(mapJobToCalendar)
          .filter((job): job is CalendarJob => Boolean(job))
          .sort((a, b) => a.sortTimestamp - b.sortTimestamp);

        setJobs(nextJobs);
        setMonthJobCount(totalRecords || nextJobs.length);
        setError('');
      } catch (fetchError: any) {
        if (requestIdRef.current !== nextRequestId) {
          return;
        }

        setJobs([]);
        setMonthJobCount(0);
        setError(fetchError?.message || 'Failed to load scheduled jobs.');
      } finally {
        if (requestIdRef.current === nextRequestId) {
          setIsLoading(false);
          setIsRefreshing(false);
        }

        isFetchingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    fetchMonthJobs(currentMonth, 'initial');
  }, [currentMonth, fetchMonthJobs]);

  useFocusEffect(
    useCallback(() => {
      agendaListRef.current?.scrollToOffset({ offset: 0, animated: false });

      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }

      fetchMonthJobs(currentMonth, 'refresh');
    }, [currentMonth, fetchMonthJobs])
  );

  const handleChangeMonth = useCallback((direction: -1 | 1) => {
    const nextMonth = startOfMonth(addMonths(currentMonth, direction));
    setCurrentMonth(nextMonth);
    setSelectedDateKey(buildDefaultSelectedDateKey(nextMonth));
  }, [currentMonth]);

  const handleRefresh = useCallback(() => {
    agendaListRef.current?.scrollToOffset({ offset: 0, animated: false });
    fetchMonthJobs(currentMonth, 'refresh');
  }, [currentMonth, fetchMonthJobs]);

  const handleOpenJob = useCallback((jobId: string) => {
    if (!jobId.trim()) {
      Alert.alert('Unable to open job', 'This job is missing an id.');
      return;
    }

    router.push({
      pathname: '../Screens/JobDetailScreen',
      params: { jobId },
    });
  }, []);

  const handleOpenCreateJob = () => {
    router.push('../Screens/CreateJobScreen');
  };

  const handleNavigate = useCallback((address: string) => {
    if (!address || address === 'No Address') {
      Alert.alert('No Address', 'This job does not have a valid address to navigate to.');
      return;
    }
    const query = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    Linking.openURL(url!).catch(() => {
      Alert.alert('Error', 'Unable to open maps application.');
    });
  }, []);

  const renderAgendaItem = useCallback(
    ({ item }: { item: CalendarJob }) => {
      const isInProgress = item.status === 'In Progress';
      const statusColorMap = STATUS_COLORS[item.color] || STATUS_COLORS.slate;
      
      return (
        <View style={styles.agendaContent}>
          <TouchableOpacity 
            style={styles.jobCard}
            onPress={() => handleOpenJob(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={styles.timePill}>
                <Text style={styles.timePillText}>{item.time}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusColorMap.bg, borderColor: statusColorMap.border }]}>
                {isInProgress && (
                  <RefreshCw size={12} color={statusColorMap.icon} style={{ marginRight: 4 }} />
                )}
                {item.status === 'Scheduled' && (
                  <Clock size={12} color={statusColorMap.icon} style={{ marginRight: 4 }} />
                )}
                {item.status === 'Completed' && (
                  <CheckCircle size={12} color={statusColorMap.icon} style={{ marginRight: 4 }} />
                )}
                {item.status === 'Cancelled' && (
                  <XCircle size={12} color={statusColorMap.icon} style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.statusPillText, { color: statusColorMap.text }]}>
                  {item.status}
                </Text>
              </View>
              <View style={{flex: 1}} />
              {!!item.jobNumber && (
                <Text style={styles.jobNumberText}>#{item.jobNumber}</Text>
              )}
            </View>

            <Text style={styles.jobTitle}>{item.title}</Text>

            <View style={styles.infoStack}>
              <View style={styles.infoItem}>
                <User size={14} color="#64748b" />
                <Text style={styles.infoText}>{item.client}</Text>
              </View>
              <View style={[styles.infoItem, { justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 12 }}>
                  <MapPin size={14} color="#64748b" />
                  <Text style={[styles.infoText, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                    {item.address}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.navigateBtn} 
                  onPress={() => handleNavigate(item.address)}
                  activeOpacity={0.7}
                >
                  <Navigation size={14} color="#2563eb" />
                  <Text style={styles.navigateBtnText}>Directions</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
              <View style={styles.badgeRow}>
                <View style={styles.typeBadge}>
                  <Briefcase size={12} color="#64748b" />
                  <Text style={styles.typeText}>{item.jobType}</Text>
                </View>
                {item.priority === 'High' && (
                  <View style={styles.priorityBadge}>
                    <AlertCircle size={12} color="#ef4444" />
                    <Text style={styles.priorityText}>High</Text>
                  </View>
                )}
              </View>
              <View style={styles.viewDetailsBtn}>
                <Text style={styles.viewDetailsText}>View Details</Text>
                <ChevronRight size={16} color="#2563eb" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    },
    [handleOpenJob, handleNavigate]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.titleText}>Jobs</Text>
            <Text style={styles.subtitleText}>{monthJobCount} Scheduled Jobs</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn} onPress={handleRefresh}>
            <MoreHorizontal size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <JobsViewSwitcher activeView="schedule" />
      </View>

      {/* Month Selector */}
      <View style={styles.monthHeaderRow}>
        <Text style={styles.monthHeaderText}>{monthLabel}</Text>
        <View style={styles.monthNavGroup}>
          <TouchableOpacity style={styles.monthNavBtn} onPress={() => handleChangeMonth(-1)}>
            <ChevronLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.monthNavBtn} onPress={() => handleChangeMonth(1)}>
            <ChevronRight size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Days Selector */}
      <View style={styles.daysContainer}>
        <ScrollView
          ref={daysScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysScrollContent}
        >
          {daysInMonthList.map((item) => {
            const isSelected = selectedDateKey === item.dateKey;
            const dayJobs = jobsByDate[item.dateKey] || [];
            const hasEvents = dayJobs.length > 0;
            const hasInProgress = dayJobs.some(j => j.status === 'In Progress');

            return (
              <TouchableOpacity
                key={item.dateKey}
                style={[styles.dayItem, isSelected && styles.dayItemSelected]}
                onPress={() => {
                  agendaListRef.current?.scrollToOffset({ offset: 0, animated: false });
                  setSelectedDateKey(item.dateKey);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayOfWeek, isSelected && styles.dayOfWeekSelected]}>
                  {item.dayOfWeek}
                </Text>
                <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                  {item.dayNumber}
                </Text>
                {/* Dot Indicator */}
                {(hasEvents || isSelected) && (
                  <View style={[
                    styles.dayDot,
                    isSelected ? styles.dayDotSelected :
                      hasInProgress ? styles.dayDotOrange : styles.dayDotGray
                  ]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Agenda List */}
      <View style={styles.agendaContainer}>
        <FlatList
          ref={agendaListRef}
          style={styles.agendaList}
          data={selectedJobs}
          keyExtractor={item => `${item.id}-${item.sortTimestamp}`}
          renderItem={renderAgendaItem}
          ListEmptyComponent={
            <EmptyAgendaState
              selectedDay={selectedDay}
              selectedDateKey={selectedDateKey}
              loading={isLoading}
            />
          }
          contentContainerStyle={styles.agendaListContent}
          showsVerticalScrollIndicator={false}
          bounces
          alwaysBounceVertical={selectedJobs.length <= 3}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#2563eb" />
          }
        />
      </View>

      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={handleOpenCreateJob}>
        <Plus size={32} color="white" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitleText: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
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
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  monthHeaderText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  monthNavGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysContainer: {
    marginBottom: 16,
  },
  daysScrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  dayItem: {
    width: 56,
    height: 76,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayItemSelected: {
    backgroundColor: '#2563eb',
  },
  dayOfWeek: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dayOfWeekSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  dayNumberSelected: {
    color: 'white',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
  },
  dayDotSelected: {
    backgroundColor: 'white',
  },
  dayDotOrange: {
    backgroundColor: '#f59e0b',
  },
  dayDotGray: {
    backgroundColor: '#cbd5e1',
  },
  agendaContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  agendaList: {
    flex: 1,
  },
  agendaContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  agendaListContent: {
    paddingBottom: 100,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusPillActive: {
    backgroundColor: '#fef3c7', // amber-100
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPillTextActive: {
    color: '#d97706', // amber-600
  },
  jobNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  infoStack: {
    gap: 8,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  navigateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
    textTransform: 'uppercase',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#2563eb', // blue-600
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#b91c1c',
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  skeletonHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  skeletonContent: {
    marginBottom: 16,
  },
  skeletonLine: {
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
  },
  skeletonTitle: {
    width: '70%',
    height: 20,
    marginBottom: 12,
  },
  skeletonClient: {
    width: '90%',
    height: 16,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default Scheduled;
