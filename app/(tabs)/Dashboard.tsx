import { router } from 'expo-router';
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  Briefcase,
  Calendar,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';

import {
  DashboardSummary,
  formatDashboardCurrency,
  getDashboardSummaryApi,
  getInvoiceStatusColor,
  getInvoiceStatusLabel,
  getJobStatusColor,
} from '@/src/services/dashboardService';

const { width } = Dimensions.get('window');
const CARD_W = (width - 48 - 12) / 2;

// ─── Sparkline ────────────────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
  const W = width - 64;
  const H = 48;
  const max = Math.max(...data, 1);
  const bw = (W - 6 * 8) / 7;
  return (
    <Svg width={W} height={H}>
      {data.map((v, i) => {
        const bh = Math.max(4, (v / max) * H);
        const isLast = i === 6;
        return (
          <Rect
            key={i}
            x={i * (bw + 8)}
            y={H - bh}
            width={bw}
            height={bh}
            rx={3}
            fill={isLast ? '#ffffff' : 'rgba(255,255,255,0.22)'}
          />
        );
      })}
    </Svg>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const todayLabel = () =>
  new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setData(await getDashboardSummaryApi()); }
    catch (e: any) { setError(e?.message ?? 'Failed to load'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) => data ? formatDashboardCurrency(n, data.currency) : `${n}`;

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return <DashboardSkeleton />;

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) return (
    <SafeAreaView style={s.root}>
      <View style={s.centered}>
        <AlertCircle size={36} color="#ef4444" />
        <Text style={s.errTxt}>{error ?? 'No data'}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
          <RefreshCw size={14} color="#fff" /><Text style={s.retryTxt}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const pct = data.revenueChangePercent;
  const pctPos = pct >= 0;
  const profitPos = data.netProfitThisMonth >= 0;

  return (
    <SafeAreaView style={s.root}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2563eb" />}
      >
        {/* ── GREETING ──────────────────────────────────────────────────── */}
        <View style={s.greeting}>
          <View style={s.greetRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.greetTxt}>{getGreeting()} 👋</Text>
              <Text style={s.bizName} numberOfLines={1}>{data.businessName}</Text>
              <View style={s.dateRow}>
                <Calendar size={13} color="#94a3b8" />
                <Text style={s.dateTxt}>{todayLabel()}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.bellBtn} onPress={() => load(true)}>
              <Bell size={20} color="#475569" />
              <View style={s.notifDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── REVENUE CARD (dark) ───────────────────────────────────────── */}
        <View style={s.revenueCard}>
          <View style={s.revenueTopRow}>
            <View style={s.revenueIconRow}>
              <CreditCard size={14} color="rgba(255,255,255,0.6)" />
              <Text style={s.revLabel}>REVENUE THIS MONTH</Text>
            </View>
          </View>
          <View style={s.revenueAmtRow}>
            <Text style={s.revenueAmt} numberOfLines={1} adjustsFontSizeToFit>{fmt(data.thisMonthRevenue)}</Text>
            {pct !== 0 && (
              <View style={[s.pctBadge, { backgroundColor: pctPos ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={[s.pctTxt, { color: pctPos ? '#15803d' : '#dc2626' }]}>
                  {pctPos ? '+' : ''}{pct}%
                </Text>
              </View>
            )}
          </View>
          <View style={s.sparkWrap}>
            <Sparkline data={data.weeklyRevenue} />
          </View>
        </View>

        {/* ── KPI ROW 1: Today's Jobs + Active ─────────────────────────── */}
        <View style={s.row}>
          <View style={[s.kpiCard, s.kpiCardLight]}>
            <View style={[s.kpiIconBox, { backgroundColor: '#eff6ff' }]}>
              <Calendar size={18} color="#2563eb" />
            </View>
            <Text style={s.kpiLabel}>TODAY'S JOBS</Text>
            <Text style={s.kpiNum}>{data.todayJobsCount}</Text>
          </View>
          <View style={[s.kpiCard, s.kpiCardLight]}>
            <View style={[s.kpiIconBox, { backgroundColor: '#f1f5f9' }]}>
              <Zap size={18} color="#475569" />
            </View>
            <Text style={s.kpiLabel}>ACTIVE JOBS</Text>
            <Text style={s.kpiNum}>{data.activeJobsCount}</Text>
          </View>
        </View>

        {/* ── KPI ROW 2: Outstanding + Profit ──────────────────────────── */}
        <View style={s.row}>
          {/* Outstanding */}
          <View style={[s.kpiCard, s.kpiCardWhite]}>
            <View style={s.blobDecor}>
              <View style={[s.blob, { backgroundColor: 'rgba(251,113,133,0.15)' }]} />
            </View>
            <Text style={s.kpiLabel}>OUTSTANDING</Text>
            <Text style={[s.kpiNumMed, { color: '#0f172a' }]} numberOfLines={1} adjustsFontSizeToFit>
              {fmt(data.outstandingAmount)}
            </Text>
            {data.overdueInvoicesCount > 0 && (
              <View style={s.overdueRow}>
                <AlertCircle size={12} color="#d97706" />
                <Text style={s.overdueTxt}>{data.overdueInvoicesCount} overdue</Text>
              </View>
            )}
          </View>

          {/* Profit */}
          <View style={[s.kpiCard, s.kpiCardWhite]}>
            <View style={s.blobDecor}>
              <View style={[s.blob, { backgroundColor: profitPos ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)' }]} />
            </View>
            <Text style={s.kpiLabel}>PROFIT (MTD)</Text>
            <Text style={[s.kpiNumMed, { color: profitPos ? '#15803d' : '#dc2626' }]} numberOfLines={1} adjustsFontSizeToFit>
              {profitPos ? '+' : ''}{fmt(data.netProfitThisMonth)}
            </Text>
            <View style={s.overdueRow}>
              {profitPos
                ? <TrendingUp size={12} color="#16a34a" />
                : <TrendingDown size={12} color="#dc2626" />}
              <Text style={[s.overdueTxt, { color: profitPos ? '#16a34a' : '#dc2626' }]}>
                {profitPos ? 'On track' : 'Below target'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── QUICK ACTIONS ─────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>QUICK ACTIONS</Text>
        <View style={s.qaRow}>
          <QA icon={<ArrowUpRight size={20} color="#2563eb" />} label="New Job"   onPress={() => router.push('../Screens/CreateJobScreen')} />
          <QA icon={<FileText size={20} color="#2563eb" />}     label="Invoice"   onPress={() => router.push('../Screens/CreateInvoiceScreen')} />
          <QA icon={<UserPlus size={20} color="#2563eb" />}     label="Customer"  onPress={() => router.push('../Screens/AddClientScreen')} />
          <QA icon={<Briefcase size={20} color="#2563eb" />}    label="Estimate"  onPress={() => router.push('../Screens/EstimateCreatorScreen')} />
        </View>

        {/* ── TODAY'S SCHEDULE ──────────────────────────────────────────── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>TODAY'S SCHEDULE</Text>
          <TouchableOpacity style={s.viewAllBtn} onPress={() => router.push('/(tabs)/Scheduled')}>
            <Text style={s.viewAllTxt}>View All</Text>
            <ChevronRight size={14} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {data.todayJobs.length === 0
          ? <View style={s.emptyCard}>
              <Calendar size={24} color="#cbd5e1" />
              <Text style={s.emptyTxt}>No jobs scheduled for today</Text>
            </View>
          : <View style={s.scheduleList}>
              {data.todayJobs.map((job, idx) => {
                const sc = getJobStatusColor(job.status);
                const done = job.status.toLowerCase() === 'completed';
                const active = job.status.toLowerCase() === 'inprogress';
                const isLast = idx === data.todayJobs.length - 1;
                const [timePart, meridiem] = job.scheduledAt.split(' ');
                return (
                  <TouchableOpacity
                    key={job.id}
                    style={s.schedRow}
                    activeOpacity={0.82}
                    onPress={() => router.push({ pathname: '../Screens/JobDetailScreen', params: { jobId: job.id } })}
                  >
                    {/* Time column */}
                    <View style={s.timeCol}>
                      <Text style={[s.timePart, done && s.strikeText]}>{timePart}</Text>
                      <Text style={[s.meridiem, done && s.strikeText]}>{meridiem}</Text>
                    </View>

                    {/* Timeline line + dot */}
                    <View style={s.timelineCol}>
                      <View style={[s.dot, { backgroundColor: sc.dot }]}>
                        {active && <View style={s.dotInner} />}
                      </View>
                      {!isLast && <View style={s.timelineLine} />}
                    </View>

                    {/* Content */}
                    <View style={s.schedContent}>
                      <View style={s.schedTopRow}>
                        <Text style={[s.schedName, done && s.strikeText]} numberOfLines={1}>
                          {job.customerName}
                        </Text>
                        <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
                          {active && <View style={[s.pillDot, { backgroundColor: sc.dot }]} />}
                          <Text style={[s.statusPillTxt, { color: sc.text }]}>{sc.label}</Text>
                        </View>
                      </View>
                      {job.jobType && (
                        <Text style={[s.schedSub, done && s.strikeSub]} numberOfLines={1}>{job.jobType}</Text>
                      )}
                      <View style={s.schedMetaRow}>
                        <View style={s.metaItem}>
                          <Clock size={10} color="#94a3b8" />
                          <Text style={s.metaTxt}>{job.scheduledAt}</Text>
                        </View>
                        <Text style={s.metaDot}>·</Text>
                        <Text style={s.metaTxt}>{job.jobNumber}</Text>
                      </View>
                    </View>

                    <ChevronRight size={15} color="#e2e8f0" />
                  </TouchableOpacity>
                );
              })}
            </View>
        }

        {/* ── RECENT INVOICES ───────────────────────────────────────────── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>RECENT INVOICES</Text>
          <TouchableOpacity style={s.viewAllBtn} onPress={() => router.push('/(tabs)/Invoices')}>
            <Text style={s.viewAllTxt}>View All</Text>
            <ChevronRight size={14} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {data.recentInvoices.length === 0
          ? <View style={s.emptyCard}>
              <FileText size={24} color="#cbd5e1" />
              <Text style={s.emptyTxt}>No invoices yet</Text>
            </View>
          : data.recentInvoices.map(inv => {
              const sc = getInvoiceStatusColor(inv.status);
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={s.invCard}
                  activeOpacity={0.82}
                  onPress={() => router.push({ pathname: '../Screens/InvoiceDetailScreen', params: { invoiceId: inv.id } })}
                >
                  <View style={s.invIconBox}>
                    <FileText size={16} color="#2563eb" />
                  </View>
                  <View style={s.invBody}>
                    <Text style={s.invCustomer} numberOfLines={1}>{inv.customerName}</Text>
                    <Text style={s.invNum}>{inv.invoiceNumber}</Text>
                  </View>
                  <View style={s.invRight}>
                    <Text style={s.invAmt}>{fmt(inv.totalAmount)}</Text>
                    <View style={[s.statusPill, { backgroundColor: sc.bg }]}>
                      <Text style={[s.statusPillTxt, { color: sc.text }]}>{getInvoiceStatusLabel(inv.status)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
        }

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity style={s.fab} activeOpacity={0.88} onPress={() => router.push('../Screens/CreateJobScreen')}>
        <ArrowUpRight size={24} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Quick Action card ────────────────────────────────────────────────────────
const QA: React.FC<{ icon: React.ReactNode; label: string; onPress: () => void }> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={s.qaCard} activeOpacity={0.75} onPress={onPress}>
    <View style={s.qaIconWrap}>{icon}</View>
    <Text style={s.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── Skeleton loading ─────────────────────────────────────────────────────────
const SkBox: React.FC<{ pulse: Animated.Value; style?: any }> = ({ pulse, style }) => (
  <Animated.View style={[sk.box, { opacity: pulse }, style]} />
);

const DashboardSkeleton: React.FC = () => {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} scrollEnabled={false}>
        {/* Greeting */}
        <View style={s.greeting}>
          <View style={s.greetRow}>
            <View style={{ flex: 1, gap: 8 }}>
              <SkBox pulse={pulse} style={{ width: 190, height: 26, borderRadius: 8 }} />
              <SkBox pulse={pulse} style={{ width: 130, height: 14, borderRadius: 6 }} />
              <SkBox pulse={pulse} style={{ width: 100, height: 12, borderRadius: 6 }} />
            </View>
            <SkBox pulse={pulse} style={{ width: 40, height: 40, borderRadius: 12 }} />
          </View>
        </View>

        {/* Revenue card */}
        <View style={sk.revenueCard}>
          <SkBox pulse={pulse} style={{ width: 150, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)' }} />
          <SkBox pulse={pulse} style={{ width: 180, height: 34, borderRadius: 10, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.18)' }} />
          <SkBox pulse={pulse} style={{ width: '100%', height: 48, borderRadius: 10, marginTop: 22, backgroundColor: 'rgba(255,255,255,0.12)' }} />
        </View>

        {/* KPI rows */}
        {[0, 1].map(r => (
          <View key={r} style={s.row}>
            {[0, 1].map(c => (
              <View key={c} style={[s.kpiCard, s.kpiCardLight]}>
                <SkBox pulse={pulse} style={{ width: 38, height: 38, borderRadius: 12 }} />
                <SkBox pulse={pulse} style={{ width: 70, height: 10, borderRadius: 5, marginTop: 12 }} />
                <SkBox pulse={pulse} style={{ width: 90, height: 28, borderRadius: 8, marginTop: 8 }} />
              </View>
            ))}
          </View>
        ))}

        {/* Quick actions */}
        <SkBox pulse={pulse} style={{ width: 120, height: 12, borderRadius: 6, marginHorizontal: 20, marginTop: 12, marginBottom: 12 }} />
        <View style={s.qaRow}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={s.qaCard}>
              <SkBox pulse={pulse} style={{ width: 40, height: 40, borderRadius: 20 }} />
              <SkBox pulse={pulse} style={{ width: 44, height: 10, borderRadius: 5 }} />
            </View>
          ))}
        </View>

        {/* Schedule list */}
        <SkBox pulse={pulse} style={{ width: 140, height: 12, borderRadius: 6, marginHorizontal: 20, marginBottom: 12 }} />
        <View style={s.scheduleList}>
          {[0, 1, 2].map(i => (
            <View key={i} style={sk.listRow}>
              <SkBox pulse={pulse} style={{ width: 40, height: 40, borderRadius: 12 }} />
              <View style={{ flex: 1, gap: 7 }}>
                <SkBox pulse={pulse} style={{ width: '60%', height: 13, borderRadius: 6 }} />
                <SkBox pulse={pulse} style={{ width: '40%', height: 11, borderRadius: 5 }} />
              </View>
              <SkBox pulse={pulse} style={{ width: 54, height: 18, borderRadius: 8 }} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f3f8', paddingBottom: Platform.OS === 'ios' ? 60 : 50 },
  scroll: { paddingBottom: 24 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadTxt: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  errTxt: { fontSize: 13, color: '#ef4444', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  retryTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Greeting
  greeting: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  greetRow: { flexDirection: 'row', alignItems: 'flex-start' },
  greetTxt: { fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  bizName: { fontSize: 14, color: '#64748b', fontWeight: '500', marginTop: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  dateTxt: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  bellBtn: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: 4, borderWidth: 1.5, borderColor: '#fff' },

  // Revenue card
  revenueCard: { marginHorizontal: 16, backgroundColor: '#1a2535', borderRadius: 20, padding: 22, marginBottom: 12 },
  revenueTopRow: { marginBottom: 10 },
  revenueIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  revenueAmtRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  revenueAmt: { fontSize: 36, fontWeight: '900', color: '#ffffff', letterSpacing: -1, flex: 1 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pctTxt: { fontSize: 12, fontWeight: '800' },
  sparkWrap: { marginTop: 4 },

  // KPI cards
  row: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 12 },
  kpiCard: { flex: 1, borderRadius: 16, padding: 16, overflow: 'hidden' },
  kpiCardLight: { backgroundColor: '#ffffff' },
  kpiCardWhite: { backgroundColor: '#ffffff', position: 'relative' },
  kpiIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  kpiNum: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  kpiNumMed: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 },

  // Decorative blob
  blobDecor: { position: 'absolute', right: -10, bottom: -10 },
  blob: { width: 80, height: 80, borderRadius: 40 },

  // Overdue + trend
  overdueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  overdueTxt: { fontSize: 11, color: '#d97706', fontWeight: '700' },

  // Quick actions
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllTxt: { fontSize: 13, fontWeight: '700', color: '#2563eb' },

  qaRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  qaCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e8edf2' },
  qaIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  qaLabel: { fontSize: 11, fontWeight: '700', color: '#334155' },

  // Schedule
  scheduleList: { marginHorizontal: 16, backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  schedRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 0 },

  timeCol: { width: 52, alignItems: 'flex-end', paddingRight: 12, paddingTop: 2 },
  timePart: { fontSize: 13, fontWeight: '800', color: '#0f172a', lineHeight: 16 },
  meridiem: { fontSize: 10, fontWeight: '600', color: '#94a3b8', lineHeight: 14 },

  timelineCol: { width: 20, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  dotInner: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginTop: 2, minHeight: 28 },

  schedContent: { flex: 1, paddingLeft: 10 },
  schedTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  schedName: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 6 },
  schedSub: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  schedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaTxt: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  metaDot: { fontSize: 11, color: '#cbd5e1' },

  strikeText: { textDecorationLine: 'line-through', color: '#94a3b8' },
  strikeSub: { textDecorationLine: 'line-through', color: '#cbd5e1' },

  // Status pill
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillTxt: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Invoice cards
  invCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  invIconBox: { width: 38, height: 38, backgroundColor: '#eff6ff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  invBody: { flex: 1 },
  invCustomer: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  invNum: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 1 },
  invRight: { alignItems: 'flex-end', gap: 5 },
  invAmt: { fontSize: 14, fontWeight: '900', color: '#0f172a' },

  // Empty
  emptyCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 14, paddingVertical: 28, alignItems: 'center', gap: 8, marginBottom: 12 },
  emptyTxt: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 96 : 84,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: '#2563eb',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    zIndex: 50,
  },
});

// ─── Skeleton styles ──────────────────────────────────────────────────────────
const sk = StyleSheet.create({
  box: { backgroundColor: '#e2e8f0' },
  revenueCard: { marginHorizontal: 16, backgroundColor: '#1a2535', borderRadius: 20, padding: 22, marginBottom: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
});
