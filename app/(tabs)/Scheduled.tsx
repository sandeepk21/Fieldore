import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreVertical,
  Plus,
  Zap
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
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
const COLUMN_WIDTH = (width - 48) / 7;
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

type CalendarJob = {
  id: string;
  title: string;
  client: string;
  status: string;
  time: string;
  color: 'blue' | 'amber' | 'green' | 'red' | 'slate';
  dateKey: string;
  sortTimestamp: number;
};

type JobsByDate = Record<string, CalendarJob[]>;

type FetchMode = 'initial' | 'refresh';

const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
    hour: 'numeric',
    minute: '2-digit',
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
      return 'blue';
    case 'scheduled':
      return 'amber';
    case 'completed':
      return 'green';
    case 'cancelled':
      return 'red';
    default:
      return 'slate';
  }
};

const normalizeStatusLabel = (status?: string | null) => {
  if (!status?.trim()) return 'Scheduled';
  if (status.trim() === 'InProgress') return 'In Progress';
  return status.trim();
};

const mapJobToCalendar = (job: JobResponse): CalendarJob | null => {
  const scheduledStart = parseApiDate(job.scheduledStartAt);
  if (!scheduledStart) return null;

  const id = job.id?.trim() || job.jobNumber?.trim();
  if (!id) return null;

  return {
    id,
    title: getJobDisplayTitle(job),
    client: getJobCustomerName(job),
    status: normalizeStatusLabel(job.status),
    time: formatTimeLabel(job.scheduledStartAt, job.scheduledEndAt),
    color: getStatusColor(job.status),
    dateKey: toDateKeyLocal(scheduledStart),
    sortTimestamp: scheduledStart.getTime(),
  };
};

const buildMonthCells = (month: Date) => {
  const firstDay = startOfMonth(month);
  const lastDay = endOfMonth(month);
  const leadingSlots = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const cells: (number | null)[] = [];

  for (let i = 0; i < leadingSlots; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const buildDefaultSelectedDateKey = (month: Date) => {
  const today = new Date();
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  return isCurrentMonth ? toDateKeyLocal(today) : toDateKeyLocal(startOfMonth(month));
};

const getDotColor = (color: CalendarJob['color']) => {
  switch (color) {
    case 'blue':
      return '#2563eb';
    case 'amber':
      return '#f59e0b';
    case 'green':
      return '#10b981';
    case 'red':
      return '#ef4444';
    default:
      return '#94a3b8';
  }
};

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

const JobCardSkeleton = () => (
  <View style={styles.jobCard}>
    <View style={styles.timeBlock} />
    <View style={styles.skeletonContent}>
      <View style={[styles.skeletonLine, styles.skeletonStatus]} />
      <View style={[styles.skeletonLine, styles.skeletonTitle]} />
      <View style={[styles.skeletonLine, styles.skeletonClient]} />
    </View>
    <View style={styles.arrowBox} />
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
      <>
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </>
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
  const monthCells = useMemo(() => buildMonthCells(currentMonth), [currentMonth]);

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

  const agendaTitle = useMemo(() => {
    const todayKey = toDateKeyLocal(new Date());
    return selectedDateKey === todayKey ? "Today's Agenda" : `Jobs for ${formatAgendaDate(selectedDateKey)}`;
  }, [selectedDateKey]);

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

  const today = new Date();
  const todayKey = toDateKeyLocal(today);

  const renderAgendaItem = useCallback(
    ({ item }: { item: CalendarJob }) => (
      <View style={styles.agendaContent}>
        <TouchableOpacity
          style={styles.jobCard}
          activeOpacity={0.9}
          onPress={() => handleOpenJob(item.id)}
        >
          <View
            style={[
              styles.timeBlock,
              (item.color === 'blue' || item.status.toLowerCase() === 'in progress') &&
              styles.timeBlockActive,
            ]}
          >
            <Clock
              size={16}
              color={
                item.color === 'blue' || item.status.toLowerCase() === 'in progress'
                  ? 'white'
                  : '#94a3b8'
              }
              strokeWidth={3}
            />
            <Text
              style={[
                styles.timeText,
                (item.color === 'blue' || item.status.toLowerCase() === 'in progress') &&
                styles.timeTextActive,
              ]}
              numberOfLines={1}
            >
              {item.time === 'No time' ? 'TBD' : item.time.split(' - ')[0]}
            </Text>
          </View>

          <View style={styles.jobDetails}>
            <View style={styles.statusRow}>
              {item.status.toLowerCase() === 'in progress' && <View style={styles.pulseDot} />}
              <Text style={styles.statusLabel}>{item.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.jobTitle}>{item.title}</Text>
            <View style={styles.clientRow}>
              <Zap size={10} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.clientName}>{item.client}</Text>
            </View>

          </View>

          <View style={styles.arrowBox}>
            <ChevronRight size={18} color="#cbd5e1" />
          </View>
        </TouchableOpacity>
      </View>

    ),
    [handleOpenJob]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity style={styles.monthNavBtn} onPress={() => handleChangeMonth(-1)}>
            <ChevronLeft size={20} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.monthTitleBox}>
            <Text style={styles.monthTitle}>Jobs</Text>
            <Text style={styles.monthSubtitle}>{monthJobCount} scheduled jobs</Text>
          </View>

          <TouchableOpacity style={styles.monthNavBtn} onPress={() => handleChangeMonth(1)}>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.moreBtn} onPress={handleRefresh}>
          <MoreVertical size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={styles.switcherWrap}>
        <JobsViewSwitcher activeView="schedule" />
        <Text style={styles.scheduleMonthLabel}>{monthLabel}</Text>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.calendarContainer}>
        <View style={styles.weekDaysRow}>
          {weekDays.map((day, index) => (
            <Text key={`${day}-${index}`} style={styles.weekDayText}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {monthCells.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const dateKey = `${currentMonth.getFullYear()}-${pad(currentMonth.getMonth() + 1)}-${pad(day)}`;
            const isSelected = selectedDateKey === dateKey;
            const isToday = todayKey === dateKey;
            const dayJobs = jobsByDate[dateKey] || [];
            const hasEvents = dayJobs.length > 0;
            const isCurrentVisibleMonth = isSameMonth(
              currentMonth,
              parseApiDate(`${dateKey}T00:00:00`) || currentMonth
            );

            return (
              <TouchableOpacity
                key={dateKey}
                onPress={() => {
                  agendaListRef.current?.scrollToOffset({ offset: 0, animated: false });
                  setSelectedDateKey(dateKey);
                }}
                style={styles.dayCell}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && styles.dayCircleSelected,
                    isToday && !isSelected && styles.dayCircleToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isCurrentVisibleMonth && styles.dayTextMuted,
                      hasEvents && !isSelected && styles.dayTextHasJob,
                      isToday && !isSelected && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </View>

                {hasEvents && !isSelected && (
                  <View style={styles.dotsContainer}>
                    {dayJobs.slice(0, 3).map(job => (
                      <View
                        key={`${job.id}-${job.sortTimestamp}`}
                        style={[styles.dot, { backgroundColor: getDotColor(job.color) }]}
                      />
                    ))}
                    {dayJobs.length > 3 && <View style={[styles.dot, styles.dotOverflow]} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.agendaContainer}>
        <View style={styles.agendaHeader}>
          <Text style={styles.agendaTitle}>{agendaTitle}</Text>
          <View style={styles.jobCountBadge}>
            <Text style={styles.jobCountText}>{selectedJobs.length} JOBS</Text>
          </View>
        </View>

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
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 15,
    gap: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  monthTitleBox: {
    flex: 1,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  monthSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  moreBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  errorBox: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#b91c1c',
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'white',
  },
  switcherWrap: {
    paddingHorizontal: 15,
    marginBottom: 16,
  },
  scheduleMonthLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'center',
  },
  calendarContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    width: COLUMN_WIDTH,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 1,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: COLUMN_WIDTH,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#2563eb',
  },
  dayCircleToday: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
  },
  dayTextMuted: {
    color: '#cbd5e1',
  },
  dayTextSelected: {
    color: 'white',
    fontWeight: '900',
  },
  dayTextHasJob: {
    color: '#0f172a',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#2563eb',
    fontWeight: '800',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 2,
    position: 'absolute',
    bottom: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotOverflow: {
    backgroundColor: '#cbd5e1',
  },
  agendaContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 1,
    borderTopColor: 'white',
    marginTop: 8,
  },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
    paddingHorizontal: 15,
    paddingTop: 32,
  },
  agendaList: {
    flex: 1,
  },
  agendaContent: {
    paddingHorizontal: 15,
    backgroundColor: '#f8fafc',
  },
  agendaListContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  agendaTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  jobCountBadge: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  jobCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  timeBlock: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  timeBlockActive: {
    backgroundColor: '#2563eb',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    marginTop: 4,
  },
  timeTextActive: {
    color: 'white',
  },
  jobDetails: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  clientName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
  jobTimeRange: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  arrowBox: {
    width: 32,
    height: 32,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 24,
    backgroundColor: '#f8fafc',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  skeletonStatus: {
    width: 86,
    height: 10,
    marginBottom: 10,
  },
  skeletonTitle: {
    width: '72%',
    height: 16,
    marginBottom: 10,
  },
  skeletonClient: {
    width: '48%',
    height: 12,
  },
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
  }
});

export default Scheduled;
