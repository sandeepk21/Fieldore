import {
  ArrowRight,
  ChevronLeft,
  Clock,
  CreditCard,
  MoreHorizontal,
  Plus,
  Zap
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Constants from "expo-constants";
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Type Definitions
 */
interface ScreenContent {
  id: number;
  title: string;
  description: string;
  accent: string;
  accentLight: string;
  Illustration: React.FC;
}

interface CRMItem {
  name: string;
  job: string;
  icon: string;
  color: string;
}

/**
 * Component: Illustration for Screen 0
 */
const CustomersIllustration = () => {
  const items: CRMItem[] = [
    { name: "Sarah Johnson", job: "Full Rewire", icon: "SJ", color: "#2563EB" },
    { name: "Mike's Cafe", job: "Leak Repair", icon: "MC", color: "#10B981" },
    { name: "Emma Davis", job: "Garden Light", icon: "ED", color: "#F59E0B" }
  ];

  return (
    <View style={styles.illustrationContainer}>
      <View style={[styles.pulseCircle, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]} />
      <View style={styles.crmList}>
        {items.map((item, i) => (
          <View key={i} style={styles.crmCard}>
            <View style={[styles.crmIcon, { backgroundColor: item.color }]}>
              <Text style={styles.crmIconText}>{item.icon}</Text>
            </View>
            <View style={styles.crmInfo}>
              <Text style={styles.crmName}>{item.name}</Text>
              <Text style={styles.crmJob}>{item.job} • Active</Text>
            </View>
            <MoreHorizontal size={14} color="#CBD5E1" />
          </View>
        ))}
      </View>
      <View style={styles.badge}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>24 Active Leads</Text>
      </View>
    </View>
  );
};

/**
 * Component: Illustration for Screen 1
 */
const ScheduleIllustration = () => (
  <View style={styles.illustrationContainer}>
    <View style={[styles.pulseCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]} />
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarTitle}>March 2026</Text>
        <View style={styles.calendarNav}>
          <View style={styles.navBtn}><Text style={styles.navBtnText}>‹</Text></View>
          <View style={styles.navBtn}><Text style={styles.navBtnText}>›</Text></View>
        </View>
      </View>
      <View style={styles.calendarGrid}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <Text key={i} style={styles.dayLabel}>{d}</Text>
        ))}
        {[...Array(28)].map((_, i) => {
          const isToday = i + 1 === 14;
          return (
            <View key={i} style={[styles.dayCell, isToday && styles.dayCellActive]}>
              <Text style={[styles.dayText, isToday && styles.dayTextActive]}>{i + 1}</Text>
              {[3, 7, 13, 20].includes(i) && !isToday && <View style={styles.dayDot} />}
            </View>
          );
        })}
      </View>
      <View style={styles.eventStrip}>
        <View style={styles.eventIconBox}>
          <Clock size={14} color="#FFF" strokeWidth={3} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle}>Emergency Repair</Text>
          <Text style={styles.eventTime}>10:30 AM — 12:00 PM</Text>
        </View>
        <Zap size={14} color="#FFF" />
      </View>
    </View>
  </View>
);

/**
 * Component: Illustration for Screen 2
 */
const PaymentIllustration = () => (
  <View style={styles.illustrationContainer}>
    <View style={[styles.pulseCircle, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]} />
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentIconBox}>
          <CreditCard size={18} color="#F59E0B" />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.balanceLabel}>BALANCE</Text>
          <Text style={styles.balanceAmount}>$4,250.00</Text>
        </View>
      </View>
      <View style={styles.paymentContent}>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentRowLabel}>Recent Job</Text>
          <Text style={styles.paymentRowValue}>+$840.00</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '70%' }]} />
        </View>
      </View>
      <TouchableOpacity style={styles.paymentBtn}>
        <Text style={styles.paymentBtnText}>Send New Invoice</Text>
        <Plus size={14} color="#FFF" strokeWidth={3} />
      </TouchableOpacity>
    </View>
  </View>
);

const screens: ScreenContent[] = [
  {
    id: 0,
    title: "Manage Your\nCustomers",
    description: "Store all your clients and job history in one place — always at your fingertips.",
    accent: "#2563EB",
    accentLight: "#EFF6FF",
    Illustration: CustomersIllustration
  },
  {
    id: 1,
    title: "Schedule Jobs\nEasily",
    description: "Plan your day with a simple calendar and smart job scheduling.",
    accent: "#10B981",
    accentLight: "#ECFDF5",
    Illustration: ScheduleIllustration
  },
  {
    id: 2,
    title: "Get Paid\nFaster",
    description: "Send professional invoices and track payments in real time.",
    accent: "#F59E0B",
    accentLight: "#FFFBEB",
    Illustration: PaymentIllustration
  }
];

export default function Onboarding() {
  const [current, setCurrent] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= screens.length) return;
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 10, duration: 150, useNativeDriver: false })
    ]).start(() => {
      setCurrent(idx);
      slideAnim.setValue(-10);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: false })
      ]).start();
    });
  };

  const screen = screens[current];

  return (
    <View style={styles.container}>
       
      <View style={styles.header}>
        {current < screens.length - 1 ? (
          <TouchableOpacity onPress={() => goTo(screens.length - 1)}>
            <Text style={styles.skipBtn}>SKIP</Text>
          </TouchableOpacity>
        ) : <View style={{ height: 16 }} />}
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.illustrationWrapper, { backgroundColor: screen.accentLight }]}>
          <screen.Illustration />
        </View>

        <View style={styles.textWrapper}>
          <Text style={styles.title}>
            {screen.title.split('\n')[0]}{'\n'}
            <Text style={{ color: screen.accent }}>{screen.title.split('\n')[1]}</Text>
          </Text>
          <Text style={styles.description}>{screen.description}</Text>
        </View>

        <View style={styles.progressContainer}>
          {screens.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.progressPill, 
                { 
                    backgroundColor: i === current ? screen.accent : '#F1F5F9', 
                    width: i === current ? 40 : 8 
                }
              ]} 
            />
          ))}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        {current < screens.length - 1 ? (
          <View style={styles.footerRow}>
            {current > 0 && (
              <TouchableOpacity 
                style={styles.backBtn} 
                onPress={() => goTo(current - 1)}
              >
                <ChevronLeft size={24} color="#94A3B8" strokeWidth={3} />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.continueBtn, { backgroundColor: screen.accent }]}
              onPress={() => goTo(current + 1)}
            >
              <Text style={styles.continueText}>Continue</Text>
              <ArrowRight size={20} color="#FFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.finalActions}>
            <TouchableOpacity style={styles.getStartedBtn}>
              <Text style={styles.getStartedText}>Get Started</Text>
              <Zap size={20} color="#FFF" fill="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.loginBtn}>I ALREADY HAVE AN ACCOUNT</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
  paddingTop: Constants.statusBarHeight,
  paddingHorizontal: 20,
  alignItems: "flex-end"
},
  skipBtn: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  illustrationWrapper: {
    height: 320,
    borderRadius: 44,
    marginTop: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pulseCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  crmList: {
    width: '100%',
    zIndex: 10,
  },
  crmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  crmIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crmIconText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  crmInfo: {
    flex: 1,
    marginLeft: 12,
  },
  crmName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  crmJob: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 30,
    right: 20,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  calendarCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 16,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    zIndex: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  calendarNav: {
    flexDirection: 'row',
  },
  navBtn: {
    width: 24,
    height: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  navBtnText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  dayCell: {
    width: '14.28%',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayCellActive: {
    backgroundColor: '#10B981',
  },
  dayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  dayTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  dayDot: {
    position: 'absolute',
    bottom: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#10B981',
  },
  eventStrip: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIconBox: {
    width: 32,
    height: 32,
    backgroundColor: '#10B981',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventTitle: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  eventTime: {
    color: '#94A3B8',
    fontSize: 9,
  },
  paymentCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 36,
    padding: 24,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    zIndex: 10,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  paymentIconBox: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#CBD5E1',
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  paymentContent: {
    marginBottom: 24,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  paymentRowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  paymentRowValue: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  paymentBtn: {
    height: 48,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    marginRight: 8,
  },
  textWrapper: {
    marginTop: 40,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 36,
    color: '#0F172A',
  },
  description: {
    marginTop: 16,
    fontSize: 18,
    color: '#64748B',
    lineHeight: 26,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    marginTop: 40,
    paddingHorizontal: 8,
  },
  progressPill: {
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
    paddingTop: 20,
  },
  footerRow: {
    flexDirection: 'row',
  },
  backBtn: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  continueBtn: {
    flex: 1,
    height: 64,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    marginRight: 12,
  },
  finalActions: {
  },
  getStartedBtn: {
    height: 72,
    backgroundColor: '#2563EB',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  getStartedText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    marginRight: 12,
  },
  loginBtn: {
    textAlign: 'center',
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  }
});