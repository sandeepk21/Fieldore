import {
    ArrowUpRight,
    Briefcase,
    ChevronDown,
    ChevronRight,
    FileText as InvoiceIcon,
    TrendingUp,
    Users,
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
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

// --- Interfaces ---
interface TopCustomer {
  name: string;
  revenue: string;
  percentage: number;
  color: string;
}

const AnalyticsScreen: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('30D');

  const topCustomers: TopCustomer[] = [
    { name: "Sarah Johnson", revenue: "$4,250", percentage: 85, color: "#2563eb" },
    { name: "Mike Torres", revenue: "$2,100", percentage: 45, color: "#10b981" },
    { name: "Emma Davis", revenue: "$1,850", percentage: 38, color: "#f59e0b" }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.titleText}>Analytics</Text>
            <Text style={styles.subtitleText}>BUSINESS PERFORMANCE</Text>
          </View>
          <TouchableOpacity style={styles.rangeDropdown}>
            <Text style={styles.rangeDropdownText}>{timeRange}</Text>
            <ChevronDown size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Time Range Selector */}
        <View style={styles.tabSelector}>
          {['7D', '30D', '90D', 'All'].map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[styles.tabBtn, timeRange === range && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, timeRange === range && styles.tabBtnTextActive]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Revenue Chart Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.cardLabel}>TOTAL REVENUE</Text>
              <View style={styles.revenueRow}>
                <Text style={styles.revenueValue}>$24,500</Text>
                <View style={styles.trendBadge}>
                  <ArrowUpRight size={12} color="#10b981" strokeWidth={3} />
                  <Text style={styles.trendText}>12%</Text>
                </View>
              </View>
            </View>
            <View style={styles.chartIconBox}>
              <TrendingUp size={20} color="#2563eb" />
            </View>
          </View>

          {/* SVG Chart */}
          <View style={styles.chartWrapper}>
            <Svg height="120" width={width - 88} viewBox="0 0 300 100">
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="100">
                  <Stop offset="0" stopColor="#2563eb" stopOpacity="0.2" />
                  <Stop offset="1" stopColor="#2563eb" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Path
                d="M0,80 Q30,70 60,75 T120,40 T180,60 T240,20 T300,30 L300,100 L0,100 Z"
                fill="url(#grad)"
              />
              <Path
                d="M0,80 Q30,70 60,75 T120,40 T180,60 T240,20 T300,30"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
              />
              <Circle cx="240" cy="20" r="4" fill="white" stroke="#2563eb" strokeWidth="2" />
            </Svg>
          </View>
        </View>

        {/* Bento Grid */}
        <View style={styles.bentoGrid}>
          <View style={[styles.bentoCard, styles.whiteCard]}>
            <View style={[styles.bentoIconBox, { backgroundColor: '#ecfdf5' }]}>
              <Briefcase size={20} color="#10b981" />
            </View>
            <Text style={styles.cardLabel}>JOBS DONE</Text>
            <View style={styles.bentoFooter}>
              <Text style={styles.bentoValue}>42</Text>
              <Text style={styles.bentoGrowth}>+4</Text>
            </View>
          </View>

          <View style={[styles.bentoCard, styles.darkCard]}>
            <View style={[styles.bentoIconBox, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <InvoiceIcon size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.cardLabel, { color: 'rgba(255,255,255,0.3)' }]}>PENDING</Text>
            <View style={styles.bentoFooter}>
              <Text style={[styles.bentoValue, { color: 'white' }]}>$8.2k</Text>
              <ArrowUpRight size={14} color="#f59e0b" />
            </View>
          </View>
        </View>

        {/* Top Customers Section */}
        <View style={styles.customersCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TOP CUSTOMERS</Text>
            <Users size={18} color="#cbd5e1" />
          </View>

          <View style={styles.customerList}>
            {topCustomers.map((customer, i) => (
              <View key={i} style={styles.customerRow}>
                <View style={styles.customerMeta}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  <Text style={styles.customerRevenue}>{customer.revenue}</Text>
                </View>
                <View style={styles.progressContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${customer.percentage}%`, backgroundColor: customer.color }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.reportBtn}>
            <Text style={styles.reportBtnText}>VIEW FULL REPORT</Text>
            <ChevronRight size={14} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingTop: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  titleText: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  subtitleText: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, marginTop: 4 },
  rangeDropdown: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  rangeDropdownText: { fontSize: 11, fontWeight: '900', color: '#64748b' },
  tabSelector: { flexDirection: 'row', backgroundColor: '#e2e8f0', padding: 4, borderRadius: 16, marginBottom: 16 },
  tabBtn: { flex: 1, paddingBlock: 8, paddingVertical: 8, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: 'white' },
  tabBtnText: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
  tabBtnTextActive: { color: '#0f172a' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 60 },
  chartCard: { backgroundColor: 'white', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cardLabel: { fontSize: 10, fontWeight: '900', color: '#cbd5e1', letterSpacing: 1.5, marginBottom: 4 },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  revenueValue: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  trendText: { fontSize: 11, fontWeight: '800', color: '#10b981' },
  chartIconBox: { width: 40, height: 40, backgroundColor: '#eff6ff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chartWrapper: { height: 120, alignItems: 'center' },
  bentoGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  bentoCard: { flex: 1, padding: 20, borderRadius: 32 },
  whiteCard: { backgroundColor: 'white', borderWidth: 1, borderColor: '#f1f5f9' },
  darkCard: { backgroundColor: '#0f172a' },
  bentoIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  bentoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bentoValue: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  bentoGrowth: { fontSize: 10, fontWeight: '800', color: '#10b981' },
  customersCard: { backgroundColor: 'white', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', letterSpacing: 1.5 },
  customerList: { gap: 24 },
  customerRow: { gap: 8 },
  customerMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { fontSize: 14, fontWeight: '700', color: '#475569' },
  customerRevenue: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  progressContainer: { height: 8, width: '100%', backgroundColor: '#f8fafc', borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  reportBtn: { marginTop: 24, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  reportBtnText: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
});

export default AnalyticsScreen;