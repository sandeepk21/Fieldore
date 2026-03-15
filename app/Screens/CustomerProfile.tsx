import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  StickyNote
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Types & Interfaces ---
type TabType = 'Jobs' | 'Invoices' | 'Estimates' | 'Notes';

interface Customer {
  name: string;
  phone: string;
  email: string;
  address: string;
  initials: string;
  color: string;
}

interface Job {
  id: number;
  title: string;
  date: string;
  status: 'Scheduled' | 'Completed';
  price: string;
}

interface Invoice {
  id: number;
  number: string;
  amount: string;
  date: string;
  status: 'Paid' | 'Overdue';
}

// --- Component ---
const CustomerProfile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('Jobs');

  const customer: Customer = {
    name: "Sarah Johnson",
    phone: "+1 (555) 123-4567",
    email: "sarah.j@example.com",
    address: "742 Evergreen Terrace, Springfield",
    initials: "SJ",
    color: "#2563eb" // Blue 600
  };

  const tabs: TabType[] = ['Jobs', 'Invoices', 'Estimates', 'Notes'];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.iconBtn}>
          <ChevronLeft size={22} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>PROFILE</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <MoreVertical size={22} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        
        {/* Profile Card */}
        <View style={styles.profileSection}>
          <View style={[styles.avatar, { backgroundColor: customer.color }]}>
            <Text style={styles.avatarText}>{customer.initials}</Text>
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Mail size={14} color="#cbd5e1" />
              <Text style={styles.metaText}>{customer.email}</Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={14} color="#cbd5e1" />
              <Text style={styles.metaText}>{customer.address}</Text>
            </View>
          </View>
        </View>

        {/* Quick Action Grid */}
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn}>
            <Phone size={20} color="#2563eb" strokeWidth={2.5} />
            <Text style={styles.actionBtnText}>CALL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <MessageSquare size={20} color="#2563eb" strokeWidth={2.5} />
            <Text style={styles.actionBtnText}>MESSAGE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]}>
            <Plus size={20} color="white" strokeWidth={3} />
            <Text style={[styles.actionBtnText, { color: 'white' }]}>JOB</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)}
              style={styles.tabItem}
            >
              <Text style={[
                styles.tabText, 
                activeTab === tab && styles.tabTextActive
              ]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Conditional Content */}
        <View style={styles.contentArea}>
          {activeTab === 'Jobs' && (
            <View style={styles.listGap}>
              <JobCard title="Bathroom Leak Repair" date="MAR 12, 2026" status="Scheduled" price="$250" />
              <JobCard title="Kitchen Sink Install" date="FEB 24, 2026" status="Completed" price="$480" />
            </View>
          )}

          {activeTab === 'Invoices' && (
            <View style={styles.listGap}>
              <InvoiceCard number="INV-2042" date="FEB 24, 2026" amount="$480.00" status="Paid" />
              <InvoiceCard number="INV-2055" date="MAR 01, 2026" amount="$120.00" status="Overdue" />
            </View>
          )}

          {activeTab === 'Notes' && (
             <View style={styles.noteCard}>
                <View style={styles.noteIconGhost}><StickyNote size={40} color="#0f172a" opacity={0.05} /></View>
                <Text style={styles.noteText}>
                  "Customer has a large dog (Max). Be sure to close the side gate upon arrival."
                </Text>
                <View style={styles.noteFooter}>
                  <Text style={styles.noteDate}>JAN 15, 2026</Text>
                  <TouchableOpacity><Text style={styles.editBtn}>Edit Note</Text></TouchableOpacity>
                </View>
             </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// --- Sub-Components ---

const JobCard: React.FC<Omit<Job, 'id'>> = ({ title, date, status, price }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.8}>
    <View style={styles.cardLeft}>
      <View style={styles.cardIconBox}>
        <Calendar size={20} color="#94a3b8" />
      </View>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardSubText}>{date}</Text>
          <View style={[styles.badge, status === 'Completed' ? styles.badgeGreen : styles.badgeBlue]}>
            <Text style={[styles.badgeText, status === 'Completed' ? styles.badgeTextGreen : styles.badgeTextBlue]}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </View>
    <View style={styles.cardRight}>
      <Text style={styles.cardPrice}>{price}</Text>
      <ChevronRight size={16} color="#cbd5e1" />
    </View>
  </TouchableOpacity>
);

const InvoiceCard: React.FC<Omit<Invoice, 'id'>> = ({ number, date, amount, status }) => (
  <View style={styles.card}>
    <View style={styles.cardLeft}>
      <View style={styles.cardIconBox}>
        <DollarSign size={20} color="#94a3b8" />
      </View>
      <View>
        <Text style={styles.cardTitle}>{number}</Text>
        <Text style={styles.cardSubText}>{date}</Text>
      </View>
    </View>
    <View style={styles.cardRight}>
      <Text style={styles.cardPrice}>{amount}</Text>
      <Text style={[styles.statusMini, { color: status === 'Paid' ? '#10b981' : '#ef4444' }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  </View>
);

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollPadding: { paddingBottom: 40 },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 2,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 16,
  },
  avatarText: { fontSize: 32, fontWeight: '900', color: 'white' },
  customerName: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  metaInfo: { marginTop: 16, gap: 8, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  actionGrid: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 80,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  actionBtnText: { fontSize: 10, fontWeight: '900', color: '#2563eb', letterSpacing: 0.5 },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 24,
  },
  tabItem: { paddingBottom: 16 },
  tabText: { fontSize: 14, fontWeight: '900', color: '#cbd5e1' },
  tabTextActive: { color: '#0f172a' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  contentArea: { padding: 24 },
  listGap: { gap: 16 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardIconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  cardSubText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeBlue: { backgroundColor: '#eff6ff' },
  badgeGreen: { backgroundColor: '#ecfdf5' },
  badgeText: { fontSize: 9, fontWeight: '900' },
  badgeTextBlue: { color: '#2563eb' },
  badgeTextGreen: { color: '#10b981' },
  cardRight: { alignItems: 'flex-end' },
  cardPrice: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  statusMini: { fontSize: 9, fontWeight: '900', marginTop: 4 },
  noteCard: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  noteIconGhost: { position: 'absolute', top: 10, right: 10 },
  noteText: { fontSize: 14, fontWeight: '500', color: '#475569', lineHeight: 22 },
  noteFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteDate: { fontSize: 10, fontWeight: '900', color: '#cbd5e1' },
  editBtn: { fontSize: 10, fontWeight: '700', color: '#2563eb' }
});

export default CustomerProfile;