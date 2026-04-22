import { isWithinInterval, parse, startOfDay } from 'date-fns';
import { router } from 'expo-router';
import {
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoInvoices } from '@/src/demo/mockFieldData';

interface Invoice {
  id: number;
  number: string;
  customer: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDisplayDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const invoices: Invoice[] = demoInvoices;

const InvoiceListScreen: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Date States
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  // Calendar Range Logic
  const onDayPress = (day: any) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate(null);
    } else {
      if (day.dateString < startDate) {
        setStartDate(day.dateString);
        setEndDate(null);
      } else {
        setEndDate(day.dateString);
      }
    }
  };

  const markedDates = useMemo(() => {
    let marks: any = {};
    if (startDate) marks[startDate] = { startingDay: true, color: '#2563eb', textColor: 'white' };
    if (endDate) {
      marks[endDate] = { endingDay: true, color: '#2563eb', textColor: 'white' };
      let start = new Date(startDate!);
      let end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (dateStr !== startDate && dateStr !== endDate) {
          marks[dateStr] = { color: '#eff6ff', textColor: '#2563eb' };
        }
      }
    }
    return marks;
  }, [startDate, endDate]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const statusMatch = activeFilter === 'All' || inv.status === activeFilter;
      const searchMatch = inv.customer.toLowerCase().includes(searchQuery.toLowerCase());
      let dateMatch = true;
      if (startDate && endDate) {
        const invDate = parse(formatDisplayDate(inv.date), 'MMM dd, yyyy', new Date());
        dateMatch = isWithinInterval(invDate, {
          start: startOfDay(new Date(startDate)),
          end: startOfDay(new Date(endDate))
        });
      }
      return statusMatch && searchMatch && dateMatch;
    });
  }, [activeFilter, searchQuery, startDate, endDate]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.titleText}>Invoices</Text>
          <TouchableOpacity 
            style={[styles.filterBtn, (startDate || activeFilter !== 'All') && styles.filterBtnActive]}
            onPress={() => setIsCalendarVisible(true)}
          >
            <SlidersHorizontal size={20} color={(startDate || activeFilter !== 'All') ? "white" : "#64748b"} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrapper}>
          <Search size={18} color="#cbd5e1" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search client..." 
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {['All', 'Paid', 'Unpaid', 'Overdue'].map(f => (
            <TouchableOpacity 
              key={f} 
              onPress={() => setActiveFilter(f)}
              style={[styles.chip, activeFilter === f && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {filteredInvoices.map(inv => (
          <View key={inv.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.iconBox}><FileText size={20} color="#609df9" /></View>
              <View style={{flex:1, marginLeft: 12}}>
                <Text style={styles.custName}>{inv.customer}</Text>
                <Text style={styles.invNum}>{inv.number} • {formatDisplayDate(inv.date)}</Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(inv.amount)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* MODAL: White Background, Dark Text Dates */}
      <Modal visible={isCalendarVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Dates</Text>
              <TouchableOpacity onPress={() => setIsCalendarVisible(false)}><X size={24} color="#000" /></TouchableOpacity>
            </View>
            <Calendar
              markingType={'period'}
              markedDates={markedDates}
              onDayPress={onDayPress}
              theme={{
                calendarBackground: '#ffffff', // Ensures white background
                textSectionTitleColor: '#94a3b8',
                dayTextColor: '#0f172a', // Dark text for dates
                todayTextColor: '#2563eb',
                selectedDayBackgroundColor: '#2563eb',
                monthTextColor: '#0f172a', // Dark text for month
                textDisabledColor: '#e2e8f0',
                arrowColor: '#2563eb',
              }}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetBtn} onPress={() => {setStartDate(null); setEndDate(null); setActiveFilter('All');}}>
                <Text style={styles.resetText}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setIsCalendarVisible(false)}>
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={() => router.push("../Screens/CreateInvoiceScreen")}>
        <Plus size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#FFF' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titleText: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  filterBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  filterBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  searchWrapper: { height: 50, backgroundColor: '#f1f5f9', borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontWeight: '600', color: '#0f172a' },
  chipScroll: { marginTop: 15 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#f8fafc', marginRight: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { fontSize: 12, fontWeight: '800', color: '#94a3b8' },
  chipTextActive: { color: 'white' },
  list: { padding: 20 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, backgroundColor: '#eff6ff', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  custName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  invNum: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  amount: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  resetBtn: { flex: 1, padding: 16, borderRadius: 15, backgroundColor: '#fef2f2', alignItems: 'center' },
  resetText: { color: '#ef4444', fontWeight: '800' },
  applyBtn: { flex: 2, padding: 16, borderRadius: 15, backgroundColor: '#0f172a', alignItems: 'center' },
  applyText: { color: 'white', fontWeight: '900' }
});

export default InvoiceListScreen;
