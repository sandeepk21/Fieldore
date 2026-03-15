import {
    ChevronRight,
    Clock,
    Filter,
    Globe,
    MoreHorizontal,
    Plus,
    Search,
    Share2,
    Target,
    User
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
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
interface Lead {
  id: number;
  name: string;
  service: string;
  source: 'Website' | 'Google Search' | 'Referral' | 'Direct';
  status: 'New' | 'Contacted' | 'Quote Sent' | 'Won' | 'Lost';
  date: string;
  color: string;
}

interface StatusStyle {
  bg: string;
  text: string;
}

// --- Helpers ---
const getStatusStyle = (status: Lead['status']): StatusStyle => {
  switch (status) {
    case 'New': return { bg: '#eff6ff', text: '#2563eb' };
    case 'Contacted': return { bg: '#eef2ff', text: '#4f46e5' };
    case 'Quote Sent': return { bg: '#fffbe6', text: '#d97706' };
    case 'Won': return { bg: '#ecfdf5', text: '#10b981' };
    case 'Lost': return { bg: '#fef2f2', text: '#ef4444' };
    default: return { bg: '#f8fafc', text: '#64748b' };
  }
};

const getSourceIcon = (source: Lead['source']) => {
  const props = { size: 12, color: '#64748b' };
  switch (source) {
    case 'Website': return <Globe {...props} />;
    case 'Google Search': return <Target {...props} />;
    case 'Referral': return <Share2 {...props} />;
    default: return <User {...props} />;
  }
};

// --- Main Component ---
const LeadListScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const leads: Lead[] = [
    { id: 1, name: "Robert Fox", service: "Roof Replacement", source: "Website", status: "New", date: "2h ago", color: "#2563eb" },
    { id: 2, name: "Jane Cooper", service: "Electrical Panel Upgrade", source: "Google Search", status: "Contacted", date: "5h ago", color: "#6366f1" },
    { id: 3, name: "Cody Fisher", service: "Kitchen Remodel", source: "Referral", status: "Quote Sent", date: "1d ago", color: "#f59e0b" },
    { id: 4, name: "Esther Howard", service: "Plumbing Installation", source: "Website", status: "Won", date: "2d ago", color: "#10b981" },
    { id: 5, name: "Cameron Williamson", service: "Fence Repair", source: "Direct", status: "Lost", date: "3d ago", color: "#f43f5e" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.titleText}>Leads</Text>
            <Text style={styles.subtitleText}>PIPELINE OVERVIEW</Text>
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
              placeholder="Search leads..."
              placeholderTextColor="#cbd5e1"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Filter size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Lead List */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.listContainer}>
          {leads.map((lead) => {
            const statusStyle = getStatusStyle(lead.status);
            return (
              <TouchableOpacity key={lead.id} style={styles.leadCard} activeOpacity={0.9}>
                {/* Top Row: Identity & Status */}
                <View style={styles.cardHeader}>
                  <View style={styles.identityGroup}>
                    <View style={[styles.avatar, { backgroundColor: lead.color }]}>
                      <Text style={styles.avatarText}>{lead.name[0]}</Text>
                    </View>
                    <View>
                      <Text style={styles.leadName}>{lead.name}</Text>
                      <Text style={styles.serviceText}>{lead.service}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {lead.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Bottom Row: Metadata */}
                <View style={styles.cardFooter}>
                  <View style={styles.sourceTag}>
                    {getSourceIcon(lead.source)}
                    <Text style={styles.sourceText}>{lead.source}</Text>
                  </View>
                  <View style={styles.timeGroup}>
                    <Clock size={12} color="#94a3b8" />
                    <Text style={styles.timeText}>{lead.date}</Text>
                  </View>
                </View>

                {/* Arrow Indicator */}
                <View style={styles.arrowContainer}>
                  <ChevronRight size={18} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9}>
        <Plus size={24} color="white" strokeWidth={2.5} />
        <Text style={styles.fabText}>Add Lead</Text>
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
    paddingBottom: 16,
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
  filterBtn: {
    width: 56,
    height: 56,
    backgroundColor: 'white',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120, // Space for FAB
  },
  listContainer: {
    gap: 16,
  },
  leadCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  identityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
  },
  leadName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  serviceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 24, // Clear space for the Chevron
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  arrowContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
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

export default LeadListScreen;