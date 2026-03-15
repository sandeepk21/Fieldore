import {
    Briefcase,
    Calendar,
    CheckCircle2,
    ChevronDown,
    Clock,
    ListChecks,
    LucideIcon,
    MapPin,
    Plus,
    StickyNote,
    Timer,
    Trash2,
    User,
    Users,
    X,
    Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Interfaces ---
interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}

interface SectionProps {
  title: string;
  accent: string;
  children: React.ReactNode;
}

interface InputFieldProps {
  label: string;
  placeholder: string;
  icon?: LucideIcon;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}

// --- Sub-Components ---

const Section: React.FC<SectionProps> = ({ title, accent, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIndicator, { backgroundColor: accent }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const InputField: React.FC<InputFieldProps> = ({ label, placeholder, icon: Icon, required, multiline, keyboardType = 'default' }) => (
  <View style={styles.inputGroup}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required && <View style={styles.requiredDot} />}
    </View>
    <View style={[styles.inputWrapper, multiline && styles.textAreaWrapper]}>
      {Icon && <Icon size={16} color="#cbd5e1" style={multiline ? styles.iconTop : styles.iconCenter} />}
      <TextInput
        style={[styles.textInput, multiline && styles.textArea, !Icon && { paddingLeft: 16 }]}
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        multiline={multiline}
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

// --- Main Screen ---

const CreateJobScreen: React.FC = () => {
  const [priority, setPriority] = useState<'Normal' | 'Urgent'>('Normal');
  const [useCustomerAddress, setUseCustomerAddress] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', task: 'Initial Inspection', completed: false },
    { id: '2', task: 'Safety Check', completed: false }
  ]);

  const addTask = () => {
    setChecklist([...checklist, { id: Date.now().toString(), task: '', completed: false }]);
  };

  const removeTask = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn}>
          <X size={20} color="#94a3b8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CREATE NEW JOB</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. Job Overview */}
          <Section title="Job Overview" accent="#2563eb">
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Customer</Text>
              <TouchableOpacity style={styles.inputWrapper} activeOpacity={0.7}>
                <User size={16} color="#cbd5e1" style={styles.iconCenter} />
                <Text style={styles.placeholderText}>Select Customer...</Text>
                <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </View>

            <InputField label="Job Title" placeholder="e.g. Master Bedroom HVAC Repair" icon={Zap} required />
            
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Job Type</Text>
                <TouchableOpacity style={styles.inputWrapper} activeOpacity={0.7}>
                  <Briefcase size={16} color="#cbd5e1" style={styles.iconCenter} />
                  <Text style={styles.selectText}>Repair</Text>
                  <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityToggle}>
                  {(['Normal', 'Urgent'] as const).map(p => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      style={[
                        styles.priorityBtn,
                        priority === p && (p === 'Urgent' ? styles.btnUrgent : styles.btnNormal)
                      ]}
                    >
                      <Text style={[styles.priorityBtnText, priority === p && styles.priorityBtnTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Section>

          {/* 2. Schedule */}
          <Section title="Schedule & Team" accent="#f59e0b">
            <View style={styles.row}>
              <View style={{ flex: 1 }}><InputField label="Start Date" placeholder="Mar 16, 2026" icon={Calendar} required /></View>
              <View style={{ flex: 1 }}><InputField label="Start Time" placeholder="09:00 AM" icon={Clock} required /></View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Duration</Text>
                <TouchableOpacity style={styles.inputWrapper} activeOpacity={0.7}>
                  <Timer size={16} color="#cbd5e1" style={styles.iconCenter} />
                  <Text style={styles.selectText}>2 Hours</Text>
                  <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Assign Tech</Text>
                <TouchableOpacity style={styles.inputWrapper} activeOpacity={0.7}>
                  <Users size={16} color="#cbd5e1" style={styles.iconCenter} />
                  <Text style={styles.selectText}>Alex (Me)</Text>
                  <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              </View>
            </View>
          </Section>

          {/* 3. Location */}
          <Section title="Job Location" accent="#10b981">
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <View style={styles.checkSquare}>
                  {useCustomerAddress && <CheckCircle2 size={18} color="#2563eb" strokeWidth={3} />}
                </View>
                <Text style={styles.toggleText}>Use customer primary address</Text>
              </View>
              <Switch
                value={useCustomerAddress}
                onValueChange={setUseCustomerAddress}
                trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                ios_backgroundColor="#e2e8f0"
              />
            </View>
            
            {!useCustomerAddress && (
              <View style={{ marginTop: 12 }}>
                <InputField label="Street Address" placeholder="123 Job Site St" icon={MapPin} />
              </View>
            )}
          </Section>

          {/* 4. Scope & Checklist */}
          <Section title="Work Scope" accent="#6366f1">
            <InputField label="Job Description" placeholder="Describe the work to be done..." icon={StickyNote} multiline />

            <View style={styles.checklistHeader}>
              <Text style={styles.label}>Initial Checklist</Text>
              <ListChecks size={14} color="#cbd5e1" />
            </View>

            <View style={styles.checkListContainer}>
              {checklist.map((item) => (
                <View key={item.id} style={styles.checkRow}>
                  <View style={styles.checkInputWrapper}>
                    <View style={styles.checkDot} />
                    <TextInput
                      style={styles.checkInput}
                      placeholder="Task description..."
                      placeholderTextColor="#cbd5e1"
                      defaultValue={item.task}
                    />
                  </View>
                  <TouchableOpacity onPress={() => removeTask(item.id)} style={styles.deleteTaskBtn}>
                    <Trash2 size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addTaskBtn} onPress={addTask}>
                <Plus size={14} color="#94a3b8" />
                <Text style={styles.addTaskText}>ADD TASK</Text>
              </TouchableOpacity>
            </View>
          </Section>

        </ScrollView>

        {/* Sticky Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.createBtn} activeOpacity={0.9}>
            <Text style={styles.createBtnText}>Create & Schedule Job</Text>
            <Calendar size={20} color="white" strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#F8FAFC',
  },
  closeBtn: { width: 40, height: 40, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  headerTitle: { fontSize: 12, fontWeight: '900', color: '#94a3b8', letterSpacing: 2 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 160 },
  formContent: { gap: 20 },
  sectionCard: { backgroundColor: 'white', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#f1f5f9', gap: 16, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionIndicator: { width: 6, height: 16, borderRadius: 3 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#0f172a', letterSpacing: 1, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 4 },
  label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' },
  placeholderText: { fontSize: 14, fontWeight: '700', color: '#cbd5e1', flex: 1 },
  selectText: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1 },
  requiredDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ef4444' },
  inputWrapper: { height: 48, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  textAreaWrapper: { height: 100, alignItems: 'flex-start', paddingTop: 12 },
  iconCenter: { marginRight: 12 },
  iconTop: { marginRight: 12, marginTop: 4 },
  textInput: { flex: 1, height: '100%', fontSize: 14, fontWeight: '700', color: '#0f172a' },
  textArea: { textAlignVertical: 'top' },
  priorityToggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, height: 48 },
  priorityBtn: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnNormal: { backgroundColor: 'white', elevation: 2 },
  btnUrgent: { backgroundColor: '#f43f5e', elevation: 2 },
  priorityBtnText: { fontSize: 10, fontWeight: '900', color: '#94a3b8' },
  priorityBtnTextActive: { color: '#0f172a' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  toggleLabelGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  checkSquare: { width: 32, height: 32, backgroundColor: 'white', borderRadius: 8, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  toggleText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  checklistHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 4, marginTop: 8 },
  checkListContainer: { gap: 10 },
  checkRow: { flexDirection: 'row', gap: 12 },
  checkInputWrapper: { flex: 1, height: 44, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  checkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', marginRight: 12 },
  checkInput: { flex: 1, height: '100%', fontSize: 13, fontWeight: '700', color: '#0f172a' },
  deleteTaskBtn: { width: 44, height: 44, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addTaskBtn: { height: 44, borderStyle: 'dashed', borderWidth: 2, borderColor: '#f1f5f9', borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  addTaskText: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  createBtn: { height: 68, backgroundColor: '#2563eb', borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 8, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  createBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
});

export default CreateJobScreen;