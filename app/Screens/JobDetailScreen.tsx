import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Phone,
  Play,
  Plus,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JobChecklistItemRequest, JobResponse } from '@/src/api/generated';
import {
  addJobNoteApi,
  getJobAddressText,
  getJobByIdApi,
  getJobCustomerName,
  getJobDisplayTitle,
  getJobInitials,
  replaceJobChecklistApi,
  updateJobStatusApi,
} from '@/src/services/jobService';

type TabType = 'Checklist' | 'Photos' | 'Notes';

const formatDate = (value?: string | null) => {
  if (!value) return 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatTime = (value?: string | null) => {
  if (!value) return 'No time';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time';

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const buildChecklistRequest = (job: JobResponse): JobChecklistItemRequest[] =>
  (job.checklistItems || []).map((item, index) => ({
    sortOrder: item.sortOrder || index + 1,
    taskName: item.taskName?.trim() || `Task ${index + 1}`,
    isCompleted: Boolean(item.isCompleted),
  }));

const SkeletonBlock = ({
  height,
  width,
  style,
}: {
  height: number;
  width: number | `${number}%`;
  style?: object;
}) => <View style={[styles.skeletonBlock, { height, width }, style]} />;

const JobDetailSkeleton = () => (
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
    <View style={styles.mapSection}>
      <View style={styles.mapPinContainer}>
        <View style={styles.mapPulse} />
        <View style={styles.mapIconBox} />
      </View>
    </View>

    <View style={styles.jobInfoSection}>
      <SkeletonBlock height={28} width="60%" />
      <View style={styles.jobMetaRow}>
        <SkeletonBlock height={14} width={96} />
        <SkeletonBlock height={14} width={132} />
      </View>
    </View>

    <View style={styles.customerSection}>
      <View style={styles.customerRow}>
        <View style={styles.skeletonAvatar} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock height={18} width="54%" />
          <SkeletonBlock height={14} width="76%" />
        </View>
      </View>
    </View>

    <View style={styles.contentPadding}>
      {[0, 1, 2].map(item => (
        <View key={item} style={styles.checkItem}>
          <SkeletonBlock height={22} width={22} style={{ borderRadius: 8 }} />
          <SkeletonBlock height={16} width="62%" />
        </View>
      ))}
    </View>
  </ScrollView>
);

const JobDetailScreen: React.FC = () => {
  const params = useLocalSearchParams<{ jobId?: string }>();
  const jobId = typeof params.jobId === 'string' ? params.jobId : '';
  const [activeTab, setActiveTab] = useState<TabType>('Checklist');
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isChecklistSaving, setIsChecklistSaving] = useState(false);
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState('');

  const loadJob = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!jobId) {
      setError('Job id is missing.');
      setJob(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (mode === 'initial') setIsLoading(true);
    if (mode === 'refresh') setIsRefreshing(true);

    try {
      const response = await getJobByIdApi(jobId);
      setJob(response);
      setError('');
    } catch (loadError: any) {
      setJob(null);
      setError(loadError?.message || 'Failed to load job.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [jobId]);

  useFocusEffect(
    useCallback(() => {
      loadJob('initial');
    }, [loadJob])
  );

  const scheduleLabel = useMemo(() => {
    if (!job?.scheduledStartAt) return 'No schedule';

    const start = `${formatDate(job.scheduledStartAt)} • ${formatTime(job.scheduledStartAt)}`;
    const end = job.scheduledEndAt ? formatTime(job.scheduledEndAt) : null;

    return end ? `${start} - ${end}` : start;
  }, [job]);

  const handleCall = async () => {
    const phone = job?.customer?.mobilePhone?.trim();
    if (!phone) return;

    const url = `tel:${phone}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const handleEmail = async () => {
    const email = job?.customer?.email?.trim();
    if (!email) return;

    const url = `mailto:${email}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const handleStatusUpdate = async () => {
    if (!job?.id) return;

    const nextStatus = job.status === 'In Progress' ? 'Completed' : 'In Progress';

    setIsStatusUpdating(true);

    try {
      const updated = await updateJobStatusApi(job.id, {
        status: nextStatus,
        actualStartAt: nextStatus === 'In Progress' ? new Date().toISOString() : job.actualStartAt || new Date().toISOString(),
        actualEndAt: nextStatus === 'Completed' ? new Date().toISOString() : null,
      });

      setJob(updated);
      setError('');
    } catch (updateError: any) {
      setError(updateError?.message || 'Failed to update job status.');
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const saveChecklist = async (nextJob: JobResponse) => {
    if (!nextJob.id) return;

    setIsChecklistSaving(true);
    setJob(nextJob);

    try {
      const updated = await replaceJobChecklistApi(nextJob.id, buildChecklistRequest(nextJob));
      setJob(updated);
      setError('');
    } catch (checklistError: any) {
      setError(checklistError?.message || 'Failed to update checklist.');
      await loadJob('refresh');
    } finally {
      setIsChecklistSaving(false);
    }
  };

  const toggleChecklistItem = async (itemId?: string) => {
    if (!job || !itemId) return;

    const nextChecklist = (job.checklistItems || []).map(item =>
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    );

    await saveChecklist({
      ...job,
      checklistItems: nextChecklist,
    });
  };

  const handleAddTask = async () => {
    const taskName = newTask.trim();
    if (!job || !taskName) return;

    const nextChecklist = [
      ...(job.checklistItems || []),
      {
        id: `local-${Date.now()}`,
        sortOrder: (job.checklistItems?.length || 0) + 1,
        taskName,
        isCompleted: false,
        completedAt: null,
        completedByUserId: null,
      },
    ];

    setNewTask('');
    await saveChecklist({
      ...job,
      checklistItems: nextChecklist,
    });
  };

  const handleAddNote = async () => {
    if (!job?.id || !newNote.trim()) return;

    setIsNoteSaving(true);

    try {
      await addJobNoteApi(job.id, { body: newNote.trim() });
      setNewNote('');
      await loadJob('refresh');
    } catch (noteError: any) {
      setError(noteError?.message || 'Failed to add note.');
    } finally {
      setIsNoteSaving(false);
    }
  };

  const statusLabel = job?.status?.trim() || 'Scheduled';
  const canStart = statusLabel === 'Scheduled';
  const canComplete = statusLabel === 'In Progress';
  const customerPhone = job?.customer?.mobilePhone?.trim();
  const customerEmail = job?.customer?.email?.trim();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerJobID}>{job?.jobNumber?.trim() || 'JOB DETAILS'}</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    statusLabel === 'Completed'
                      ? '#10b981'
                      : statusLabel === 'In Progress'
                        ? '#2563eb'
                        : statusLabel === 'Cancelled'
                          ? '#dc2626'
                          : '#f59e0b',
                },
              ]}
            />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerBtn} onPress={() => loadJob('refresh')}>
          <MoreVertical size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <JobDetailSkeleton />
      ) : error && !job ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Unable to load job</Text>
          <Text style={styles.stateError}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadJob('initial')}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadJob('refresh')} tintColor="#2563eb" />
          }
        >
          <View style={styles.mapSection}>
            <View style={styles.mapPinContainer}>
              <View style={styles.mapPulse} />
              <View style={styles.mapIconBox}>
                <MapPin size={20} color="white" fill="white" />
              </View>
            </View>
            <Text style={styles.addressHint}>{getJobAddressText(job)}</Text>
          </View>

          <View style={styles.jobInfoSection}>
            <Text style={styles.jobTitle}>{getJobDisplayTitle(job)}</Text>
            <View style={styles.jobMetaRow}>
              <View style={styles.metaItem}>
                <Calendar size={14} color="#cbd5e1" />
                <Text style={styles.metaText}>{formatDate(job?.scheduledStartAt)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={14} color="#cbd5e1" />
                <Text style={styles.metaText}>{scheduleLabel}</Text>
              </View>
            </View>
            <View style={styles.jobTagRow}>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{job?.jobType?.trim() || 'General'}</Text>
              </View>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{job?.priority?.trim() || 'Normal'} priority</Text>
              </View>
            </View>
            {!!job?.description?.trim() && (
              <Text style={styles.descriptionText}>{job.description.trim()}</Text>
            )}
          </View>

          <View style={styles.customerSection}>
            <View style={styles.customerRow}>
              <View style={styles.customerAvatar}>
                <Text style={styles.avatarText}>{getJobInitials(job)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{getJobCustomerName(job)}</Text>
                <Text style={styles.customerAddress}>{getJobAddressText(job)}</Text>
              </View>
              <View style={styles.customerActions}>
                <TouchableOpacity
                  style={[styles.actionCircle, !customerPhone && styles.actionCircleDisabled]}
                  onPress={handleCall}
                  disabled={!customerPhone}
                >
                  <Phone size={18} color={customerPhone ? '#2563eb' : '#cbd5e1'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionCircle, !customerEmail && styles.actionCircleDisabled]}
                  onPress={handleEmail}
                  disabled={!customerEmail}
                >
                  <Mail size={18} color={customerEmail ? '#2563eb' : '#cbd5e1'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {!!error ? (
            <View style={styles.inlineErrorBox}>
              <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.tabBar}>
            {(['Checklist', 'Photos', 'Notes'] as TabType[]).map(tab => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                {activeTab === tab ? <View style={styles.tabIndicator} /> : null}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.contentPadding}>
            {activeTab === 'Checklist' ? (
              <View style={styles.listGap}>
                {(job?.checklistItems || []).map(item => (
                  <TouchableOpacity
                    key={item.id || item.taskName}
                    onPress={() => toggleChecklistItem(item.id)}
                    style={[styles.checkItem, item.isCompleted && styles.checkItemDone]}
                    disabled={isChecklistSaving}
                  >
                    <View style={[styles.checkBox, item.isCompleted && styles.checkBoxDone]}>
                      {item.isCompleted ? <Check size={14} color="white" strokeWidth={4} /> : null}
                    </View>
                    <Text style={[styles.checkText, item.isCompleted && styles.checkTextDone]}>
                      {item.taskName?.trim() || 'Untitled task'}
                    </Text>
                  </TouchableOpacity>
                ))}

                <View style={styles.addTaskRow}>
                  <TextInput
                    style={styles.addTaskInput}
                    placeholder="Add checklist task..."
                    placeholderTextColor="#cbd5e1"
                    value={newTask}
                    onChangeText={setNewTask}
                  />
                  <TouchableOpacity
                    style={[styles.addTaskBtn, !newTask.trim() && styles.addTaskBtnDisabled]}
                    onPress={handleAddTask}
                    disabled={!newTask.trim() || isChecklistSaving}
                  >
                    {isChecklistSaving ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <>
                        <Plus size={16} color="#2563eb" />
                        <Text style={styles.addTaskText}>ADD</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {activeTab === 'Photos' ? (
              <View style={styles.photoGrid}>
                {(job?.photos || []).length > 0 ? (
                  (job?.photos || []).map(photo => (
                    <View key={photo.id || photo.storagePath} style={styles.photoCard}>
                      {photo.storagePath ? (
                        <Image source={{ uri: photo.storagePath }} style={styles.photoImage} contentFit="cover" />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Text style={styles.photoPlaceholderText}>No preview</Text>
                        </View>
                      )}
                      <View style={styles.photoMeta}>
                        <Text style={styles.photoCaption}>{photo.caption?.trim() || 'Untitled photo'}</Text>
                        <Text style={styles.photoTimestamp}>{formatDateTime(photo.createdAt)}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardTitle}>No photos yet</Text>
                    <Text style={styles.emptyCardText}>
                      The photo API is ready in the service layer, but the app still needs a storage upload flow before we can capture and post files here.
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {activeTab === 'Notes' ? (
              <View style={styles.notesSection}>
                <View style={styles.noteComposer}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Add an update for your team or customer..."
                    placeholderTextColor="#cbd5e1"
                    multiline
                    value={newNote}
                    onChangeText={setNewNote}
                  />
                  <TouchableOpacity
                    style={[styles.noteSubmitBtn, !newNote.trim() && styles.noteSubmitBtnDisabled]}
                    onPress={handleAddNote}
                    disabled={!newNote.trim() || isNoteSaving}
                  >
                    {isNoteSaving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.noteSubmitText}>Add Note</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {(job?.notes || []).length > 0 ? (
                  (job?.notes || []).map(note => (
                    <View key={note.id || note.createdAt} style={styles.noteCard}>
                      <View style={styles.noteHeader}>
                        <View style={styles.noteAuthorBadge}>
                          <MessageSquare size={14} color="#2563eb" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.noteAuthor}>{note.createdByDisplayName?.trim() || 'Team update'}</Text>
                          <Text style={styles.noteTime}>{formatDateTime(note.createdAt)}</Text>
                        </View>
                      </View>
                      <Text style={styles.noteBody}>{note.body?.trim() || 'No note content'}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardTitle}>No notes yet</Text>
                    <Text style={styles.emptyCardText}>Keep job progress visible by posting updates here.</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      {job ? (
        <View style={styles.footer}>
          {canStart || canComplete ? (
          <TouchableOpacity
            onPress={handleStatusUpdate}
            style={[styles.startBtn, canComplete && styles.completeBtn]}
            activeOpacity={0.9}
            disabled={isStatusUpdating}
          >
            {isStatusUpdating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                {canStart ? (
                  <Play size={20} color="white" fill="white" />
                ) : (
                  <CheckCircle2 size={18} color="white" strokeWidth={2.5} />
                )}
                <Text style={styles.startBtnText}>{canStart ? 'Start Job' : 'Complete Job'}</Text>
              </>
            )}
          </TouchableOpacity>
          ) : (
            <View style={styles.statusFooterCard}>
              <Text style={styles.statusFooterLabel}>Current status</Text>
              <Text style={styles.statusFooterText}>{statusLabel}</Text>
            </View>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
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
  headerBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: { alignItems: 'center' },
  headerJobID: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  scrollPadding: { paddingBottom: 150 },
  mapSection: {
    height: 200,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mapPinContainer: { alignItems: 'center', justifyContent: 'center' },
  mapPulse: { position: 'absolute', width: 60, height: 60, backgroundColor: 'rgba(37, 99, 235, 0.2)', borderRadius: 30 },
  mapIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  addressHint: {
    marginTop: 20,
    fontSize: 13,
    color: '#1e3a8a',
    fontWeight: '700',
    textAlign: 'center',
  },
  jobInfoSection: {
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  jobTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', letterSpacing: -1, lineHeight: 28 },
  jobMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748b', fontWeight: '500', flexShrink: 1 },
  jobTagRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 16 },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  tagText: { fontSize: 11, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase' },
  descriptionText: { marginTop: 16, fontSize: 14, lineHeight: 22, color: '#475569' },
  customerSection: { padding: 24, backgroundColor: 'white' },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  customerAvatar: {
    width: 48,
    height: 48,
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '900', color: '#2563eb' },
  customerName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  customerAddress: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  customerActions: { flexDirection: 'row', gap: 8 },
  actionCircle: {
    width: 40,
    height: 40,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircleDisabled: { backgroundColor: '#f8fafc' },
  inlineErrorBox: {
    marginHorizontal: 24,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inlineErrorText: { fontSize: 12, color: '#b91c1c', fontWeight: '700' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabItem: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '900', color: '#cbd5e1' },
  tabTextActive: { color: '#2563eb' },
  tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#2563eb', borderRadius: 3 },
  contentPadding: { padding: 24 },
  listGap: { gap: 12 },
  checkItem: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkItemDone: { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  checkText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#475569' },
  checkTextDone: { color: '#059669', textDecorationLine: 'line-through', opacity: 0.7 },
  addTaskRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  addTaskInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  addTaskBtn: {
    minWidth: 84,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
  },
  addTaskBtnDisabled: { opacity: 0.55 },
  addTaskText: { fontSize: 11, fontWeight: '900', color: '#2563eb' },
  photoGrid: { gap: 12 },
  photoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoImage: { width: '100%', height: 220, backgroundColor: '#e2e8f0' },
  photoPlaceholder: { height: 220, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  photoMeta: { padding: 14 },
  photoCaption: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  photoTimestamp: { fontSize: 12, color: '#64748b', marginTop: 4 },
  notesSection: { gap: 12 },
  noteComposer: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  noteInput: {
    minHeight: 96,
    textAlignVertical: 'top',
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  noteSubmitBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteSubmitBtnDisabled: { opacity: 0.5 },
  noteSubmitText: { color: 'white', fontSize: 13, fontWeight: '800' },
  noteCard: {
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 16,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  noteAuthorBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteAuthor: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  noteTime: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  noteBody: { fontSize: 14, lineHeight: 22, color: '#475569' },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  emptyCardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyCardText: { fontSize: 13, color: '#64748b', lineHeight: 20 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  startBtn: {
    height: 68,
    backgroundColor: '#2563eb',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  completeBtn: { backgroundColor: '#10b981' },
  startBtnText: { color: 'white', fontSize: 18, fontWeight: '900' },
  statusFooterCard: {
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  statusFooterLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.1, textTransform: 'uppercase' },
  statusFooterText: { marginTop: 4, fontSize: 18, fontWeight: '900', color: '#0f172a' },
  skeletonBlock: { backgroundColor: '#e2e8f0', borderRadius: 999 },
  skeletonAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#e2e8f0' },
  stateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  stateTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  stateError: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  retryBtn: { minHeight: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  retryBtnText: { color: 'white', fontSize: 14, fontWeight: '800' },
});

export default JobDetailScreen;
