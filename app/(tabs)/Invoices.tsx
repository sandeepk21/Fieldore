import { router } from 'expo-router';
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Clock,
    DollarSign,
    FileText,
    MoreHorizontal,
    Plus,
    Search,
    SlidersHorizontal
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Interfaces ---
interface Invoice {
  id: number;
  number: string;
  customer: string;
  amount: string;
  date: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}

interface StatusStyles {
  bg: string;
  text: string;
  border: string;
}

// --- Main Component ---
const Invoice: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filters = ['All', 'Paid', 'Unpaid', 'Overdue'];

  const invoices: Invoice[] = [
    { id: 1, number: "INV-2042", customer: "Sarah Johnson", amount: "$1,280.00", date: "Mar 10, 2026", status: "Paid" },
    { id: 2, number: "INV-2045", customer: "Mike Torres", amount: "$450.00", date: "Mar 08, 2026", status: "Unpaid" },
    { id: 3, number: "INV-2038", customer: "Emma Davis", amount: "$890.00", date: "Feb 24, 2026", status: "Overdue" },
    { id: 4, number: "INV-2048", customer: "Alex Chen", amount: "$2,100.00", date: "Mar 01, 2026", status: "Unpaid" },
    { id: 5, number: "INV-2030", customer: "Jessica White", amount: "$320.00", date: "Jan 15, 2026", status: "Paid" }
  ];

  const getStatusStyles = (status: Invoice['status']): StatusStyles => {
    switch (status) {
      case 'Paid': return { bg: '#ecfdf5', text: '#10b981', border: '#d1fae5' };
      case 'Unpaid': return { bg: '#fffbeb', text: '#d97706', border: '#fef3c7' };
      case 'Overdue': return { bg: '#fef2f2', text: '#ef4444', border: '#fee2e2' };
      default: return { bg: '#f8fafc', text: '#94a3b8', border: '#f1f5f9' };
    }
  };

  const StatusIcon = ({ status }: { status: Invoice['status'] }) => {
    const size = 12;
    const color = getStatusStyles(status).text;
    switch (status) {
      case 'Paid': return <CheckCircle2 size={size} color={color} />;
      case 'Unpaid': return <Clock size={size} color={color} />;
      case 'Overdue': return <AlertCircle size={size} color={color} />;
      default: return null;
    }
  };

  const filteredInvoices = activeFilter === 'All' 
    ? invoices 
    : invoices.filter(inv => inv.status === activeFilter);

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.titleText}>Invoices</Text>
            <Text style={styles.revenueText}>$24,500 TOTAL REVENUE</Text>
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
              placeholder="Search invoice or client..."
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
                style={[styles.chip, isActive && styles.chipActive]}
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
        {filteredInvoices.length > 0 ? (
          <View style={styles.listContainer}>
            {filteredInvoices.map((inv) => {
              const statusStyle = getStatusStyles(inv.status);
              return (
                <TouchableOpacity key={inv.id} style={styles.invoiceCard} activeOpacity={0.9} onPress={()=>{router.push("../Screens/InvoiceDetailScreen")}}>
                  {/* Card Top */}
                  <View style={styles.cardHeader}>
                    <View style={styles.identityGroup}>
                      <View style={styles.iconBox}>
                        <FileText size={20} color="#94a3b8" />
                      </View>
                      <View>
                        <Text style={styles.customerName}>{inv.customer}</Text>
                        <Text style={styles.invoiceNumber}>{inv.number}</Text>
                      </View>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }
                    ]}>
                      <StatusIcon status={inv.status} />
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {inv.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Card Divider */}
                  <View style={styles.divider} />

                  {/* Card Bottom */}
                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.footerLabel}>DUE DATE</Text>
                      <Text style={styles.footerValue}>{inv.date}</Text>
                    </View>
                    <View style={styles.amountGroup}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.footerLabel}>AMOUNT</Text>
                        <Text style={styles.amountText}>{inv.amount}</Text>
                      </View>
                      <View style={styles.arrowBox}>
                        <ChevronRight size={16} color="#cbd5e1" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <DollarSign size={32} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No {activeFilter.toLowerCase()} invoices</Text>
            <Text style={styles.emptySubtitle}>
              Select a different filter or create a new invoice to get paid.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={()=>{router.push("../Screens/CreateInvoiceScreen")}}>
        <Plus size={24} color="white" strokeWidth={2.5} />
        <Text style={styles.fabText}>Create Invoice</Text>
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
  revenueText: {
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
  invoiceCard: {
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
  },
  identityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  invoiceNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: 1,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#f8fafc',
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 1,
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  amountGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
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

export default Invoice;