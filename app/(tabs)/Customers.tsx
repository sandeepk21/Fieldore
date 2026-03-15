import { router } from 'expo-router';
import {
  Calendar,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  Phone,
  Search,
  SlidersHorizontal,
  UserPlus
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
interface Customer {
  id: number;
  name: string;
  phone: string;
  lastJob: string;
  location: string;
  initials: string;
  color: string;
  status: 'Active' | 'Idle';
}

// --- Components ---

const CustomerCard: React.FC<{ customer: Customer }> = ({ customer }) => (
  <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={()=>{router.push("../Screens/CustomerProfile")}}>
    {/* Card Top: Identity */}
    <View style={styles.cardHeader}>
      <View style={[styles.avatar, { backgroundColor: customer.color }]}>
        <Text style={styles.avatarText}>{customer.initials}</Text>
      </View>
      <View style={styles.headerInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <View style={[
            styles.statusBadge, 
            customer.status === 'Active' ? styles.badgeActive : styles.badgeIdle
          ]}>
            <Text style={[
              styles.statusText, 
              customer.status === 'Active' ? styles.textActive : styles.textIdle
            ]}>
              {customer.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.phoneRow}>
          <Phone size={12} color="#94a3b8" />
          <Text style={styles.phoneText}>{customer.phone}</Text>
        </View>
      </View>
      <ChevronRight size={18} color="#cbd5e1" />
    </View>

    {/* Divider */}
    <View style={styles.divider} />

    {/* Card Bottom: Metadata */}
    <View style={styles.metadataGrid}>
      <View style={styles.metaItem}>
        <View style={styles.metaIconBox}>
          <Calendar size={14} color="#94a3b8" />
        </View>
        <View>
          <Text style={styles.metaLabel}>LAST JOB</Text>
          <Text style={styles.metaValue}>{customer.lastJob}</Text>
        </View>
      </View>
      <View style={styles.metaItem}>
        <View style={styles.metaIconBox}>
          <MapPin size={14} color="#94a3b8" />
        </View>
        <View>
          <Text style={styles.metaLabel}>LOCATION</Text>
          <Text style={styles.metaValue}>{customer.location}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

const Customers: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Customers');

  const customers: Customer[] = [
    { id: 1, name: "Sarah Johnson", phone: "+1 (555) 123-4567", lastJob: "Mar 10, 2026", location: "Brooklyn, NY", initials: "SJ", color: "#2563eb", status: "Active" },
    { id: 2, name: "Mike Torres", phone: "+1 (555) 987-6543", lastJob: "Mar 08, 2026", location: "Queens, NY", initials: "MT", color: "#10b981", status: "Active" },
    { id: 3, name: "Emma Davis", phone: "+1 (555) 456-7890", lastJob: "Feb 24, 2026", location: "Manhattan, NY", initials: "ED", color: "#f59e0b", status: "Idle" },
    { id: 4, name: "Alex Chen", phone: "+1 (555) 222-3333", lastJob: "Mar 01, 2026", location: "Jersey City, NJ", initials: "AC", color: "#4f46e5", status: "Active" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.titleText}>Customers</Text>
            <Text style={styles.countText}>1428 TOTAL CLIENTS</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn}>
            <MoreHorizontal size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrapper}>
            <Search size={18} color="#cbd5e1" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search name or phone..."
              placeholderTextColor="#cbd5e1"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <SlidersHorizontal size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.listContainer}>
          {customers.map((c) => (
            <CustomerCard key={c.id} customer={c} />
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={()=>{router.push("../Screens/AddClientScreen")}}>
        <UserPlus size={24} color="white" strokeWidth={2.5} />
        <Text style={styles.fabText}>Add Customer</Text>
      </TouchableOpacity>

      
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  titleText: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  countText: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginTop: 4 },
  moreBtn: { width: 44, height: 44, backgroundColor: 'white', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  searchRow: { flexDirection: 'row', gap: 12 },
  searchWrapper: { flex: 1, height: 56, backgroundColor: 'white', borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, fontWeight: '700', color: '#0f172a' },
  filterBtn: { width: 56, height: 56, backgroundColor: 'white', borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 160 },
  listContainer: { gap: 16 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900', color: 'white' },
  headerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#ecfdf5' },
  badgeIdle: { backgroundColor: '#f8fafc' },
  statusText: { fontSize: 9, fontWeight: '900' },
  textActive: { color: '#10b981' },
  textIdle: { color: '#94a3b8' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  phoneText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  divider: { height: 1, backgroundColor: '#f8fafc', marginVertical: 16 },
  metadataGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaIconBox: { width: 32, height: 32, backgroundColor: '#f8fafc', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metaLabel: { fontSize: 9, fontWeight: '900', color: '#cbd5e1', marginBottom: 2 },
  metaValue: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  fab: { position: 'absolute', bottom: 100, right: 24, height: 64, paddingHorizontal: 24, backgroundColor: '#2563eb', borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 8, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 15 },
  fabText: { color: 'white', fontSize: 14, fontWeight: '900' },
 
});

export default Customers;