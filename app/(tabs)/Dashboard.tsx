import {
  Bell,
  Calendar,
  ChevronRight,
  FileText,
  LucideIcon,
  MapPin,
  Plus,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import {
  Dimensions,

  Platform,

  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Interfaces ---
interface StatItem {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

interface ScheduleItem {
  time: string;
  client: string;
  type: string;
  status: 'In Progress' | 'Upcoming';
}

// --- Components ---

const StatCard: React.FC<{ item: StatItem }> = ({ item }) => {
  const Icon = item.icon;
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: item.bg }]}>
        <Icon size={20} color={item.color} />
      </View>
      <View>
        <Text style={styles.statValue}>{item.value}</Text>
        <Text style={styles.statLabel}>{item.label}</Text>
      </View>
    </View>
  );
};

const Dashboard: React.FC = () => {
  const stats: StatItem[] = [
    { label: "Today's Jobs", value: "8", icon: Calendar, color: "#2563eb", bg: "#eff6ff" },
    { label: "Pending Invoices", value: "12", icon: FileText, color: "#f59e0b", bg: "#fffbeb" },
    { label: "Revenue (MTD)", value: "$12.4k", icon: TrendingUp, color: "#10b981", bg: "#ecfdf5" },
    { label: "New Leads", value: "5", icon: Users, color: "#6366f1", bg: "#eef2ff" },
  ];

  const schedule: ScheduleItem[] = [
    { time: "09:00 AM", client: "Sarah Johnson", type: "Pipe Repair", status: "In Progress" },
    { time: "11:30 AM", client: "Mike Torres", type: "Full Rewiring", status: "Upcoming" },
    { time: "02:00 PM", client: "Emma Davis", type: "Garden Lighting", status: "Upcoming" },
    { time: "04:30 PM", client: "Alex Chen", type: "Annual Inspection", status: "Upcoming" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>WEDNESDAY, MARCH 11</Text>
          <Text style={styles.greetingText}>
            Hi, <Text style={styles.blueText}>Alex!</Text> 👋
          </Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
          <Bell size={22} color="#475569" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, i) => (
            <StatCard key={i} item={stat} />
          ))}
        </View>

        {/* Schedule Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scheduleList}>
          {schedule.map((job, i) => (
            <TouchableOpacity key={i} style={styles.scheduleCard} activeOpacity={0.9}>
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: job.status === 'In Progress' ? '#2563eb' : '#f1f5f9' }
              ]} />
              
              <View style={styles.jobInfo}>
                <View style={styles.jobHeaderRow}>
                  <Text style={styles.jobTime}>{job.time}</Text>
                  {job.status === 'In Progress' && (
                    <View style={styles.activeBadge}>
                      <View style={styles.pulseDot} />
                      <Text style={styles.activeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.clientName}>{job.client}</Text>
                <View style={styles.jobMetaRow}>
                  <View style={styles.metaItem}>
                    <Zap size={10} color="#f59e0b" fill="#f59e0b" />
                    <Text style={styles.metaText}>{job.type}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MapPin size={10} color="#94a3b8" />
                    <Text style={styles.metaText}>2.4 mi</Text>
                  </View>
                </View>
              </View>
              <ChevronRight size={18} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button - Lowered slightly since Nav is gone */}
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
    backgroundColor: '#F8FAFC',
    paddingBottom: Platform.OS === "ios" ? 60 : 50
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
  blueText: {
    color: '#2563eb',
  },
  notificationBtn: {
    width: 48,
    height: 48,
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  notificationDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    backgroundColor: '#ef4444',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40, // Reduced padding as we don't need to clear the Nav bar
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    width: (width - 48 - 16) / 2,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
    gap: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  scheduleList: {
    gap: 12,
  },
  scheduleCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusIndicator: {
    width: 6,
    height: 48,
    borderRadius: 3,
  },
  jobInfo: {
    flex: 1,
  },
  jobHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  pulseDot: {
    width: 4,
    height: 4,
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  activeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2563eb',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  jobMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === "ios" ? 100 : 90, // Positioned closer to the bottom now that Nav is gone
    right: 15,
    width: 64,
    height: 64,
    backgroundColor: '#2563eb',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    zIndex: 50,
  },
});

export default Dashboard;