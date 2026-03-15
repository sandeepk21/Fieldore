import { router } from 'expo-router';
import {
    Briefcase,
    Calendar,
    ChevronRight,
    Clock,
    MoreHorizontal,
    Plus,
    Search,
    SlidersHorizontal,
    User
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Interfaces ---
interface Job {
  id: number;
  title: string;
  customer: string;
  date: string;
  time: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
}

interface StatusStyles {
  bg: string;
  text: string;
  border: string;
}

// --- Main Component ---
const JobList: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filters = ['All', 'Scheduled', 'In Progress', 'Completed'];

  const jobs: Job[] = [
    { id: 1, title: "Bathroom Leak Repair", customer: "Sarah Johnson", date: "Mar 11, 2026", time: "09:00 AM", status: "In Progress" },
    { id: 2, title: "Kitchen Rewiring", customer: "Mike Torres", date: "Mar 11, 2026", time: "11:30 AM", status: "Scheduled" },
    { id: 3, title: "AC Unit Maintenance", customer: "Emma Davis", date: "Mar 12, 2026", time: "10:00 AM", status: "Scheduled" },
    { id: 4, title: "Main Pipe Replacement", customer: "Alex Chen", date: "Mar 10, 2026", time: "Completed", status: "Completed" },
    { id: 5, title: "Garden Lighting Install", customer: "Jessica White", date: "Mar 09, 2026", time: "Completed", status: "Completed" }
  ];

  const getStatusStyles = (status: Job['status']): StatusStyles => {
    switch (status) {
      case 'In Progress': return { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe' };
      case 'Scheduled': return { bg: '#fffbeb', text: '#d97706', border: '#fef3c7' };
      case 'Completed': return { bg: '#ecfdf5', text: '#10b981', border: '#d1fae5' };
      default: return { bg: '#f8fafc', text: '#94a3b8', border: '#f1f5f9' };
    }
  };

  const filteredJobs = activeFilter === 'All' 
    ? jobs 
    : jobs.filter(job => job.status === activeFilter);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.titleText}>Job List</Text>
            <Text style={styles.subtitleText}>
              {filteredJobs.length} {activeFilter === 'All' ? 'ACTIVE' : activeFilter.toUpperCase()} JOBS
            </Text>
          </View>
          <TouchableOpacity style={styles.moreBtn}>
            <MoreHorizontal size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Search size={18} color="#cbd5e1" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs or clients..."
              placeholderTextColor="#cbd5e1"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterSettingsBtn}>
            <SlidersHorizontal size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterChipsContainer}
        >
          {filters.map(filter => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.chip,
                  isActive && styles.chipActive
                ]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main List */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {filteredJobs.length > 0 ? (
          <View style={styles.listContainer}>
            {filteredJobs.map((job) => {
              const statusStyle = getStatusStyles(job.status);
              return (
                <TouchableOpacity key={job.id} style={styles.jobCard} activeOpacity={0.9} onPress={()=>{router.push("../Screens/JobDetailScreen")}}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleInfo}>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <View style={styles.customerRow}>
                        <User size={12} color="#cbd5e1" />
                        <Text style={styles.customerName}>{job.customer}</Text>
                      </View>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }
                    ]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {job.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardBottom}>
                    <View style={styles.metaInfoRow}>
                      <View style={styles.metaItem}>
                        <Calendar size={13} color="#cbd5e1" />
                        <Text style={styles.metaText}>{job.date}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={13} color="#cbd5e1" />
                        <Text style={styles.metaText}>{job.time}</Text>
                      </View>
                    </View>
                    <View style={styles.arrowBox}>
                      <ChevronRight size={16} color="#cbd5e1" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Briefcase size={32} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No {activeFilter.toLowerCase()} jobs</Text>
            <Text style={styles.emptySubtitle}>
              Try changing your filters or create a new job to get started.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9}>
        <Plus size={24} color="white" strokeWidth={2.5} />
        <Text style={styles.fabText}>Create Job</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: '#F8FAFC',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -1,
  },
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
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchWrapper: {
    flex: 1,
    height: 56,
    backgroundColor: 'white',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
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
  filterChipsContainer: {
    gap: 8,
    paddingBottom: 16,
  },
  chip: {
    // px: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  chipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
  },
  chipTextActive: {
    color: 'white',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140, // Space for FAB
  },
  listContainer: {
    gap: 16,
    paddingTop: 8,
  },
  jobCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleInfo: {
    flex: 1,
    paddingRight: 12,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 16,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === "ios" ? 100 : 90,
    right: 24,
    height: 64,
    paddingHorizontal: 24,
    backgroundColor: '#2563eb',
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  fabText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
});

export default JobList;