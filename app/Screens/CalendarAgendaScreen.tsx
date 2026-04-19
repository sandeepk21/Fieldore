import {
    ChevronLeft,
    ChevronRight,
    Clock,
    MoreVertical,
    Plus,
    User,
    Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 7; // Accounting for 24px padding on each side

// --- Interfaces ---
interface Job {
  id: number;
  title: string;
  time: string;
  client: string;
  status: 'In Progress' | 'Scheduled';
  color: 'blue' | 'amber';
}

interface JobEvents {
  [key: number]: Job[];
}

const CalendarAgendaScreen: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number>(11);

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const jobEvents: JobEvents = {
    11: [
      { id: 1, title: "Emergency Pipe Repair", time: "09:00 AM", client: "Sarah Johnson", status: "In Progress", color: "blue" },
      { id: 2, title: "Kitchen Rewiring", time: "11:30 AM", client: "Mike Torres", status: "Scheduled", color: "amber" },
      { id: 3, title: "Boiler Service", time: "03:00 PM", client: "Robert Fox", status: "Scheduled", color: "blue" },
    ],
    12: [
      { id: 4, title: "AC Installation", time: "10:00 AM", client: "Emma Davis", status: "Scheduled", color: "blue" },
    ]
  };

  return (
    <SafeAreaView style={styles.container}>
      

      {/* Header Navigation */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.monthTitle}>March 2026</Text>
          <ChevronRight size={20} color="#cbd5e1" />
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <MoreVertical size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Calendar Grid Section */}
      <View style={styles.calendarContainer}>
        {/* Weekday Labels */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((d, i) => (
            <Text key={i} style={styles.weekDayText}>{d}</Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.daysGrid}>
          {daysInMonth.map((day) => {
            const isSelected = selectedDay === day;
            const hasEvents = jobEvents[day];

            return (
              <TouchableOpacity
                key={day}
                onPress={() => setSelectedDay(day)}
                style={styles.dayCell}
              >
                <View style={[
                  styles.dayCircle,
                  isSelected && styles.dayCircleSelected
                ]}>
                  <Text style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    !isSelected && [3, 7, 12, 19, 24].includes(day) && styles.dayTextHasJob
                  ]}>
                    {day}
                  </Text>
                </View>

                {/* Event Dots */}
                {hasEvents && !isSelected && (
                  <View style={styles.dotsContainer}>
                    {hasEvents.map((job, i) => (
                      <View 
                        key={i} 
                        style={[
                          styles.dot, 
                          { backgroundColor: job.color === 'blue' ? '#2563eb' : '#f59e0b' }
                        ]} 
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Agenda Section */}
      <View style={styles.agendaContainer}>
        <View style={styles.agendaHeader}>
          <Text style={styles.agendaTitle}>
            {selectedDay === 11 ? "Today's Agenda" : `Jobs for Mar ${selectedDay}`}
          </Text>
          <View style={styles.jobCountBadge}>
            <Text style={styles.jobCountText}>
              {jobEvents[selectedDay]?.length || 0} JOBS
            </Text>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.agendaScroll}
        >
          {jobEvents[selectedDay] ? jobEvents[selectedDay].map((job) => (
            <TouchableOpacity key={job.id} style={styles.jobCard} activeOpacity={0.9}>
              {/* Status-colored Time Block */}
              <View style={[
                styles.timeBlock,
                job.status === 'In Progress' && styles.timeBlockActive
              ]}>
                <Clock size={16} color={job.status === 'In Progress' ? 'white' : '#94a3b8'} strokeWidth={3} />
                <Text style={[
                  styles.timeText,
                  job.status === 'In Progress' && styles.timeTextActive
                ]}>
                  {job.time.split(' ')[0]}
                </Text>
              </View>

              <View style={styles.jobDetails}>
                <View style={styles.statusRow}>
                  {job.status === 'In Progress' && <View style={styles.pulseDot} />}
                  <Text style={styles.statusLabel}>{job.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <View style={styles.clientRow}>
                  <User size={12} color="#cbd5e1" />
                  <Text style={styles.clientName}>{job.client}</Text>
                </View>
              </View>

              <View style={styles.arrowBox}>
                <ChevronLeft size={18} color="#cbd5e1" style={{ transform: [{ rotate: '180deg' }] }} />
              </View>
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Zap size={32} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No jobs scheduled</Text>
              <Text style={styles.emptySubtitle}>ENJOY YOUR FREE TIME!</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9}>
        <Plus size={32} color="white" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 60,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  moreBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: 48,
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
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
  },
  dayTextSelected: {
    color: 'white',
    fontWeight: '900',
  },
  dayTextHasJob: {
    color: '#0f172a',
    fontWeight: '700',
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
  agendaContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderTopWidth: 1,
    borderTopColor: 'white',
    paddingHorizontal: 24,
    paddingTop: 32,
    // Shadow for the "lifted" agenda look
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  agendaTitle: {
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
  agendaScroll: {
    paddingBottom: 120,
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
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBlockActive: {
    backgroundColor: '#2563eb',
  },
  timeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    marginTop: 2,
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
    color: '#cbd5e1',
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
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
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
    color: '#cbd5e1',
  },
  emptySubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
});

export default CalendarAgendaScreen;