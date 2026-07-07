import { router } from 'expo-router';
import { ArrowLeft, Check, Crown, ExternalLink, Zap } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSubscription } from '@/src/context/SubscriptionContext';
import {
  WEB_PRICING_URL,
  getStatusColor,
  getStatusLabel,
} from '@/src/services/subscriptionService';

export default function SubscriptionScreen() {
  const { subscription, loading, refresh } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openPricing = () => Linking.openURL(WEB_PRICING_URL);

  const sub = subscription;
  const statusStyle = sub ? getStatusColor(sub.status) : { bg: '#f1f5f9', text: '#64748b' };
  const usage = sub?.usage;
  const jobsUnlimited = usage?.jobLimit == null;
  const jobsUsed = usage?.completedJobs ?? 0;
  const jobsCap = usage?.jobLimit ?? 0;
  const jobsPct = jobsUnlimited || jobsCap === 0 ? 0 : Math.min(1, jobsUsed / jobsCap);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.title}>Subscription</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
      >
        {/* Plan card */}
        <View style={s.planCard}>
          <View style={s.planTopRow}>
            <View style={s.planIconBox}>
              <Crown size={20} color="#2563eb" />
            </View>
            <View style={[s.statusPill, { backgroundColor: statusStyle.bg }]}>
              <Text style={[s.statusTxt, { color: statusStyle.text }]}>
                {sub ? getStatusLabel(sub.status) : loading ? 'Loading…' : 'No plan'}
              </Text>
            </View>
          </View>
          <Text style={s.planName}>{sub?.planName ?? 'Free'}</Text>
          <Text style={s.planMeta}>
            {sub?.billingCycle === 'half_yearly' ? 'Billed every 6 months' : sub?.billingCycle === 'monthly' ? 'Billed monthly' : '—'}
            {sub?.renewsOn ? ` · Renews ${sub.renewsOn}` : ''}
          </Text>
        </View>

        {/* Usage */}
        {usage && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>USAGE THIS PERIOD</Text>
            <View style={s.usageCard}>
              <View style={s.usageRow}>
                <Text style={s.usageLabel}>Completed jobs</Text>
                <Text style={s.usageVal}>
                  {jobsUnlimited ? `${jobsUsed} · Unlimited` : `${jobsUsed} / ${jobsCap}`}
                </Text>
              </View>
              {!jobsUnlimited && (
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${jobsPct * 100}%`, backgroundColor: jobsPct >= 1 ? '#dc2626' : '#2563eb' }]} />
                </View>
              )}
              <View style={s.usageGrid}>
                <UsageStat label="Invoices" value={usage.invoicesCreated} />
                <UsageStat label="Customers" value={usage.customersAdded} />
                <UsageStat label="Employees" value={usage.employees} />
              </View>
            </View>
          </View>
        )}

        {/* Features */}
        {sub && sub.features.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>PLAN FEATURES</Text>
            <View style={s.featCard}>
              {sub.features.map((f) => (
                <View key={f.featureKey} style={s.featRow}>
                  <View style={[s.featCheck, { backgroundColor: f.enabled ? '#ecfdf5' : '#f1f5f9' }]}>
                    <Check size={13} color={f.enabled ? '#059669' : '#cbd5e1'} />
                  </View>
                  <Text style={[s.featTxt, !f.enabled && s.featTxtOff]}>
                    {f.label ?? f.featureKey}
                    {f.limit != null ? ` (${f.limit})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upgrade CTA */}
        <TouchableOpacity style={s.cta} activeOpacity={0.9} onPress={openPricing}>
          <Zap size={18} color="#fff" fill="#fff" />
          <Text style={s.ctaTxt}>{sub?.isActive ? 'Change or Manage Plan' : 'Upgrade Now'}</Text>
          <ExternalLink size={16} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={s.ctaNote}>
          Plans are purchased securely on the Fieldore website. You'll return here automatically.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const UsageStat = ({ label, value }: { label: string; value: number }) => (
  <View style={s.statBox}>
    <Text style={s.statVal}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  scroll: { padding: 16, paddingBottom: 48 },

  planCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#eef2f7', marginBottom: 20 },
  planTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  planIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusTxt: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  planName: { fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  planMeta: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginTop: 4 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 10, marginLeft: 2 },

  usageCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#eef2f7' },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  usageLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  usageVal: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', overflow: 'hidden', marginBottom: 16 },
  barFill: { height: 8, borderRadius: 4 },
  usageGrid: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 },

  featCard: { backgroundColor: '#fff', borderRadius: 16, padding: 8, borderWidth: 1, borderColor: '#eef2f7' },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 10 },
  featCheck: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  featTxt: { fontSize: 14, fontWeight: '600', color: '#0f172a', flex: 1 },
  featTxtOff: { color: '#cbd5e1', textDecorationLine: 'line-through' },

  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 17, marginTop: 4 },
  ctaTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  ctaNote: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12, paddingHorizontal: 20, lineHeight: 17 },
});
