import {
    Calendar,
    Camera,
    Check,
    CheckCircle2,
    ChevronLeft,
    Clock,
    FileText,
    MapPin,
    MessageSquare,
    MoreVertical,
    Navigation,
    Phone,
    Play,
    Plus
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

// --- Types ---
type TabType = 'Checklist' | 'Photos' | 'Notes';

interface ChecklistItem {
  id: number;
  task: string;
  completed: boolean;
}

const JobDetailScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('Checklist');
  const [jobStarted, setJobStarted] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 1, task: 'Inspect main water line', completed: true },
    { id: 2, task: 'Identify leak source', completed: true },
    { id: 3, task: 'Replace copper fitting', completed: false },
    { id: 4, task: 'Pressure test system', completed: false },
  ]);

  const toggleCheck = (id: number) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header Nav */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn}>
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerJobID}>JOB ID #4820</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: jobStarted ? '#2563eb' : '#f59e0b' }]} />
            <Text style={styles.statusText}>{jobStarted ? 'In Progress' : 'Scheduled'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerBtn}>
          <MoreVertical size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        
        {/* Map Preview Placeholder */}
        <View style={styles.mapSection}>
          <View style={styles.mapPinContainer}>
             <View style={styles.mapPulse} />
             <View style={styles.mapIconBox}>
                <MapPin size={20} color="white" fill="white" />
             </View>
          </View>
          <TouchableOpacity style={styles.directionsBtn} activeOpacity={0.8}>
             <Navigation size={14} color="#2563eb" />
             <Text style={styles.directionsBtnText}>DIRECTIONS</Text>
          </TouchableOpacity>
        </View>

        {/* Job Information */}
        <View style={styles.jobInfoSection}>
          <Text style={styles.jobTitle}>Emergency Pipe Repair & Leak Detection</Text>
          <View style={styles.jobMetaRow}>
            <View style={styles.metaItem}>
               <Calendar size={14} color="#cbd5e1" />
               <Text style={styles.metaText}>Mar 11, 2026</Text>
            </View>
            <View style={styles.metaItem}>
               <Clock size={14} color="#cbd5e1" />
               <Text style={styles.metaText}>09:00 AM — 11:30 AM</Text>
            </View>
          </View>
        </View>

        {/* Customer Card */}
        <View style={styles.customerSection}>
          <View style={styles.customerRow}>
             <View style={styles.customerAvatar}>
                <Text style={styles.avatarText}>SJ</Text>
             </View>
             <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>Sarah Johnson</Text>
                <Text style={styles.customerAddress}>742 Evergreen Terrace</Text>
             </View>
             <View style={styles.customerActions}>
                <TouchableOpacity style={styles.actionCircle}><Phone size={18} color="#2563eb" /></TouchableOpacity>
                <TouchableOpacity style={styles.actionCircle}><MessageSquare size={18} color="#2563eb" /></TouchableOpacity>
             </View>
          </View>
        </View>

        {/* Tabs System */}
        <View style={styles.tabBar}>
          {(['Checklist', 'Photos', 'Notes'] as TabType[]).map(tab => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.contentPadding}>
          {activeTab === 'Checklist' && (
            <View style={styles.listGap}>
              {checklist.map(item => (
                <TouchableOpacity 
                  key={item.id} 
                  onPress={() => toggleCheck(item.id)}
                  style={[styles.checkItem, item.completed && styles.checkItemDone]}
                >
                  <View style={[styles.checkBox, item.completed && styles.checkBoxDone]}>
                    {item.completed && <Check size={14} color="white" strokeWidth={4} />}
                  </View>
                  <Text style={[styles.checkText, item.completed && styles.checkTextDone]}>{item.task}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addTaskBtn}>
                 <Plus size={16} color="#94a3b8" />
                 <Text style={styles.addTaskText}>ADD TASK</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'Photos' && (
             <View style={styles.photoGrid}>
                <TouchableOpacity style={styles.takePhotoBtn}>
                   <Camera size={24} color="#94a3b8" />
                   <Text style={styles.takePhotoText}>TAKE PHOTO</Text>
                </TouchableOpacity>
                {[1, 2, 3].map(i => (
                   <View key={i} style={styles.photoBox}>
                      <View style={styles.photoOverlay}>
                         <Text style={styles.photoTimestamp}>Mar 11 • 09:15</Text>
                      </View>
                   </View>
                ))}
             </View>
          )}
        </View>
      </ScrollView>

      {/* Dynamic Action Footer */}
      <View style={styles.footer}>
        {!jobStarted ? (
          <TouchableOpacity 
            onPress={() => setJobStarted(true)}
            style={styles.startBtn}
            activeOpacity={0.9}
          >
            <Play size={20} color="white" fill="white" />
            <Text style={styles.startBtnText}>Start Job</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.startedRow}>
            <TouchableOpacity style={styles.completeBtn} activeOpacity={0.9}>
               <CheckCircle2 size={18} color="white" strokeWidth={2.5} />
               <Text style={styles.startedBtnText}>Complete Job</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.invoiceBtn} activeOpacity={0.9}>
               <FileText size={18} color="white" />
               <Text style={styles.startedBtnText}>Invoice</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollPadding: { paddingBottom: 150 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBtn: { width: 40, height: 40, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitleContainer: { alignItems: 'center' },
  headerJobID: { fontSize: 10, fontWeight: '900', color: '#cbd5e1', letterSpacing: 1.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  mapSection: { height: 180, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  mapPinContainer: { alignItems: 'center', justifyContent: 'center' },
  mapPulse: { position: 'absolute', width: 60, height: 60, backgroundColor: 'rgba(37, 99, 235, 0.2)', borderRadius: 30 },
  mapIconBox: { width: 40, height: 40, backgroundColor: '#2563eb', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
  directionsBtn: { position: 'absolute', bottom: 16, right: 16, height: 40, paddingHorizontal: 16, backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 4, shadowOpacity: 0.1, shadowRadius: 5 },
  directionsBtnText: { fontSize: 11, fontWeight: '900', color: '#0f172a' },
  jobInfoSection: { padding: 24, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  jobTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -1, lineHeight: 28 },
  jobMetaRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  customerSection: { padding: 24, backgroundColor: 'white' },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  customerAvatar: { width: 48, height: 48, backgroundColor: '#eff6ff', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '900', color: '#2563eb' },
  customerName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  customerAddress: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  customerActions: { flexDirection: 'row', gap: 8 },
  actionCircle: { width: 40, height: 40, backgroundColor: '#eff6ff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabItem: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '900', color: '#cbd5e1' },
  tabTextActive: { color: '#2563eb' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#2563eb', borderRadius: 3 },
  contentPadding: { padding: 24 },
  listGap: { gap: 12 },
  checkItem: { padding: 16, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkItemDone: { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
  checkBox: { width: 24, height: 24, borderRadius: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  checkBoxDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  checkText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  checkTextDone: { color: '#059669', textDecorationLine: 'line-through', opacity: 0.6 },
  addTaskBtn: { padding: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#f1f5f9', borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  addTaskText: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  takePhotoBtn: { width: (width - 60) / 2, aspectRatio: 1, backgroundColor: '#f8fafc', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', gap: 8 },
  takePhotoText: { fontSize: 10, fontWeight: '900', color: '#94a3b8' },
  photoBox: { width: (width - 60) / 2, aspectRatio: 1, backgroundColor: '#cbd5e1', borderRadius: 24, overflow: 'hidden' },
  photoOverlay: { position: 'absolute', bottom: 12, left: 12 },
  photoTimestamp: { fontSize: 9, fontWeight: '700', color: 'white' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  startBtn: { height: 68, backgroundColor: '#2563eb', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 },
  startBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
  startedRow: { flexDirection: 'row', gap: 12 },
  completeBtn: { flex: 1, height: 68, backgroundColor: '#10b981', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  invoiceBtn: { flex: 1, height: 68, backgroundColor: '#0f172a', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startedBtnText: { color: 'white', fontSize: 14, fontWeight: '900' },
});

export default JobDetailScreen;