import {
    ArrowDownRight,
    ArrowUpRight,
    Briefcase,
    RefreshCw,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import {
    AnalyticsPeriod,
    AnalyticsSummary,
    CATEGORY_COLORS,
    PERIODS,
    getAnalyticsSummaryApi,
} from '@/src/services/analyticsService';
import { formatCurrency } from '@/src/utils/currency';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 96;
const CHART_HEIGHT = 140;
const BAR_PAIR_GAP = 4;

const AnalyticsScreen: React.FC = () => {
    const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
    const [data, setData] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (p: AnalyticsPeriod) => {
        setLoading(true);
        setError(null);
        try {
            const result = await getAnalyticsSummaryApi(p);
            setData(result);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(period); }, [period, load]);

    const changePeriod = (p: AnalyticsPeriod) => { setPeriod(p); };

    const fmt = (n: number) => formatCurrency(n);

    const isUp = (data?.revenueChangePercent ?? 0) >= 0;

    // ── SVG bar chart ──────────────────────────────────────────────────────────
    const renderBarChart = () => {
        if (!data || !data.revenueChart.length) return null;
        const pts = data.revenueChart;
        const maxVal = Math.max(...pts.flatMap(p => [p.revenue, p.expenses]), 1);
        const n = pts.length;
        const availW = CHART_WIDTH - 8;
        const pairW = availW / n;
        const barW = Math.max(8, (pairW - BAR_PAIR_GAP * 3) / 2);
        const labelH = 18;
        const chartH = CHART_HEIGHT - labelH;

        return (
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                {pts.map((pt, i) => {
                    const revH = Math.max(2, (pt.revenue / maxVal) * (chartH - 8));
                    const expH = Math.max(2, (pt.expenses / maxVal) * (chartH - 8));
                    const x = i * pairW + BAR_PAIR_GAP;
                    const ry = chartH - revH;
                    const ey = chartH - expH;
                    return (
                        <React.Fragment key={i}>
                            <Rect x={x} y={ry} width={barW} height={revH} rx={4} fill="#2563eb" opacity={0.85} />
                            <Rect x={x + barW + BAR_PAIR_GAP} y={ey} width={barW} height={expH} rx={4} fill="#f59e0b" opacity={0.75} />
                            <SvgText
                                x={x + barW}
                                y={CHART_HEIGHT - 2}
                                fontSize={9}
                                fill="#94a3b8"
                                textAnchor="middle"
                                fontWeight="600"
                            >
                                {pt.label}
                            </SvgText>
                        </React.Fragment>
                    );
                })}
            </Svg>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>Analytics</Text>
                        <Text style={styles.subtitle}>BUSINESS PERFORMANCE</Text>
                    </View>
                    <TouchableOpacity onPress={() => load(period)} style={styles.refreshBtn} disabled={loading}>
                        <RefreshCw size={16} color="#64748b" />
                    </TouchableOpacity>
                </View>
                <View style={styles.periodTabs}>
                    {PERIODS.map(p => (
                        <TouchableOpacity
                            key={p.key}
                            onPress={() => changePeriod(p.key)}
                            style={[styles.periodTab, period === p.key && styles.periodTabActive]}
                        >
                            <Text style={[styles.periodTabText, period === p.key && styles.periodTabTextActive]}>
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Loading analytics…</Text>
                </View>
            ) : error ? (
                <View style={styles.centerBox}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => load(period)} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : data ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {/* Revenue card */}
                    <View style={styles.revenueCard}>
                        <View style={styles.revenueCardTop}>
                            <View>
                                <Text style={styles.revenueLabel}>TOTAL REVENUE</Text>
                                <View style={styles.revenueRow}>
                                    <Text style={styles.revenueValue}>{fmt(data.totalRevenue)}</Text>
                                    <View style={[styles.changeBadge, { backgroundColor: isUp ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)' }]}>
                                        {isUp
                                            ? <ArrowUpRight size={12} color="#10b981" strokeWidth={3} />
                                            : <ArrowDownRight size={12} color="#ef4444" strokeWidth={3} />
                                        }
                                        <Text style={[styles.changeText, { color: isUp ? '#10b981' : '#ef4444' }]}>
                                            {Math.abs(data.revenueChangePercent)}%
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.revenueSubLabel}>vs previous period</Text>
                            </View>
                            <View style={styles.revenueIconBox}>
                                <TrendingUp size={20} color="white" />
                            </View>
                        </View>

                        <View style={styles.chartContainer}>
                            {renderBarChart()}
                        </View>

                        <View style={styles.chartLegend}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                                <Text style={styles.legendText}>Revenue</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                                <Text style={styles.legendText}>Expenses</Text>
                            </View>
                        </View>
                    </View>

                    {/* KPI grid row 1 */}
                    <View style={styles.kpiRow}>
                        <View style={styles.kpiCard}>
                            <View style={[styles.kpiIconPill, { backgroundColor: '#eff6ff' }]}>
                                <Briefcase size={16} color="#2563eb" />
                            </View>
                            <Text style={styles.kpiLabel}>JOBS DONE</Text>
                            <Text style={styles.kpiValue}>{data.completedJobs}</Text>
                            <Text style={styles.kpiSub}>of {data.totalJobs} total</Text>
                        </View>
                        <View style={styles.kpiCard}>
                            <View style={[styles.kpiIconPill, { backgroundColor: '#f0fdf4' }]}>
                                <Users size={16} color="#16a34a" />
                            </View>
                            <Text style={styles.kpiLabel}>NEW CLIENTS</Text>
                            <Text style={styles.kpiValue}>{data.newCustomers}</Text>
                            <Text style={styles.kpiSub}>this period</Text>
                        </View>
                    </View>

                    {/* KPI grid row 2 */}
                    <View style={styles.kpiRow}>
                        <View style={styles.kpiCard}>
                            <View style={[styles.kpiIconPill, { backgroundColor: '#fefce8' }]}>
                                <Zap size={16} color="#ca8a04" />
                            </View>
                            <Text style={styles.kpiLabel}>AVG JOB VALUE</Text>
                            <Text style={styles.kpiValue}>{fmt(data.avgJobValue)}</Text>
                            <Text style={styles.kpiSub}>per completed job</Text>
                        </View>
                        <View style={[styles.kpiCard, { backgroundColor: data.netProfit >= 0 ? '#f0fdf4' : '#fef2f2', borderColor: data.netProfit >= 0 ? '#bbf7d0' : '#fecaca' }]}>
                            <View style={[styles.kpiIconPill, { backgroundColor: data.netProfit >= 0 ? '#dcfce7' : '#fee2e2' }]}>
                                <TrendingUp size={16} color={data.netProfit >= 0 ? '#16a34a' : '#dc2626'} />
                            </View>
                            <Text style={styles.kpiLabel}>NET PROFIT</Text>
                            <Text style={[styles.kpiValue, { color: data.netProfit >= 0 ? '#16a34a' : '#dc2626' }]}>
                                {fmt(data.netProfit)}
                            </Text>
                            <Text style={styles.kpiSub}>{fmt(data.totalExpenses)} in expenses</Text>
                        </View>
                    </View>

                    {/* Job status */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>JOB BREAKDOWN</Text>
                        <View style={styles.statusRow}>
                            {[
                                { label: 'Scheduled',   val: data.scheduledJobs,  color: '#2563eb', bg: '#eff6ff' },
                                { label: 'In Progress', val: data.inProgressJobs, color: '#d97706', bg: '#fffbeb' },
                                { label: 'Completed',   val: data.completedJobs,  color: '#16a34a', bg: '#f0fdf4' },
                                { label: 'Cancelled',   val: data.cancelledJobs,  color: '#dc2626', bg: '#fef2f2' },
                            ].map(s => (
                                <View key={s.label} style={[styles.statusBox, { backgroundColor: s.bg }]}>
                                    <Text style={[styles.statusVal, { color: s.color }]}>{s.val}</Text>
                                    <Text style={[styles.statusLabel, { color: s.color }]}>{s.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Expense categories */}
                    {data.expensesByCategory.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>EXPENSES BY CATEGORY</Text>
                            <View style={styles.catList}>
                                {data.expensesByCategory.map(cat => {
                                    const color = CATEGORY_COLORS[cat.category] ?? '#64748b';
                                    return (
                                        <View key={cat.category} style={styles.catRow}>
                                            <View style={styles.catMeta}>
                                                <View style={styles.catLeft}>
                                                    <View style={[styles.catDot, { backgroundColor: color }]} />
                                                    <Text style={styles.catName}>{cat.label}</Text>
                                                </View>
                                                <Text style={styles.catAmount}>{fmt(cat.amount)}</Text>
                                            </View>
                                            <View style={styles.catBarBg}>
                                                <View style={[styles.catBar, { width: `${cat.percent}%`, backgroundColor: color }]} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Top customers */}
                    {data.topCustomers.length > 0 && (
                        <View style={styles.card}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={styles.cardTitle}>TOP CUSTOMERS</Text>
                                <Users size={16} color="#cbd5e1" />
                            </View>
                            <View style={styles.custList}>
                                {data.topCustomers.map((c, i) => {
                                    const maxRev = data.topCustomers[0]?.revenue ?? 1;
                                    const pct = Math.round((c.revenue / maxRev) * 100);
                                    const colors = ['#2563eb', '#10b981', '#f59e0b', '#7c3aed', '#ec4899'];
                                    const col = colors[i % colors.length];
                                    return (
                                        <View key={i} style={styles.custRow}>
                                            <View style={styles.custMeta}>
                                                <Text style={styles.custName}>{c.name}</Text>
                                                <View style={styles.custRight}>
                                                    <Text style={styles.custJobs}>{c.jobCount} job{c.jobCount !== 1 ? 's' : ''}</Text>
                                                    <Text style={styles.custRevenue}>{fmt(c.revenue)}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.custBarBg}>
                                                <View style={[styles.custBar, { width: `${pct}%`, backgroundColor: col }]} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                </ScrollView>
            ) : null}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
    title: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
    subtitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, marginTop: 3 },
    refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
    periodTabs: { flexDirection: 'row', backgroundColor: '#e2e8f0', padding: 4, borderRadius: 16, marginBottom: 4 },
    periodTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12 },
    periodTabActive: { backgroundColor: 'white' },
    periodTabText: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
    periodTabTextActive: { color: '#0f172a' },

    centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
    errorText: { fontSize: 14, color: '#ef4444', fontWeight: '600', textAlign: 'center', paddingHorizontal: 32 },
    retryBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
    retryText: { color: 'white', fontWeight: '700', fontSize: 14 },

    scrollContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 60 },

    // Revenue card
    revenueCard: { backgroundColor: '#1a2535', borderRadius: 28, padding: 24, marginBottom: 16 },
    revenueCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    revenueLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 6 },
    revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    revenueValue: { fontSize: 30, fontWeight: '900', color: 'white', letterSpacing: -1 },
    changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    changeText: { fontSize: 11, fontWeight: '800' },
    revenueSubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 },
    revenueIconBox: { width: 44, height: 44, backgroundColor: 'rgba(37,99,235,0.3)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    chartContainer: { marginBottom: 12 },
    chartLegend: { flexDirection: 'row', gap: 20 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

    // KPI grid
    kpiRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
    kpiCard: { flex: 1, backgroundColor: 'white', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#f1f5f9' },
    kpiIconPill: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    kpiLabel: { fontSize: 9, fontWeight: '800', color: '#cbd5e1', letterSpacing: 1.5, marginBottom: 4 },
    kpiValue: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
    kpiSub: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 2 },

    // Generic card
    card: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' },
    cardTitle: { fontSize: 10, fontWeight: '900', color: '#0f172a', letterSpacing: 1.5, marginBottom: 16 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },

    // Job status
    statusRow: { flexDirection: 'row', gap: 10 },
    statusBox: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center' },
    statusVal: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
    statusLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },

    // Expense categories
    catList: { gap: 16 },
    catRow: { gap: 8 },
    catMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    catDot: { width: 10, height: 10, borderRadius: 5 },
    catName: { fontSize: 13, fontWeight: '600', color: '#475569' },
    catAmount: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
    catBarBg: { height: 7, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
    catBar: { height: '100%', borderRadius: 4 },

    // Top customers
    custList: { gap: 20 },
    custRow: { gap: 8 },
    custMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    custName: { fontSize: 13, fontWeight: '700', color: '#334155' },
    custRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    custJobs: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
    custRevenue: { fontSize: 13, fontWeight: '900', color: '#0f172a' },
    custBarBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
    custBar: { height: '100%', borderRadius: 3 },
});

export default AnalyticsScreen;
